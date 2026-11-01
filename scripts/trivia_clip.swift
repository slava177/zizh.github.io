// Makes a clip for the start of the Trivia page from an iPhone video (macOS):
//
//     swift scripts/trivia_clip.swift trivia/IMG_7563.MOV images/trivia/2020-10-15-feeding-a-squirrel 3.5 10
//     swift scripts/trivia_clip.swift trivia/IMG_3388.MOV images/trivia/2024-09-02-feeding-a-bird 2.5 10 arm
//
// cuts `duration` seconds from `start` into <name>.mp4 (H.264, 1080x1920, no sound, HDR
// turned into ordinary color), saves its first frame as <name>.jpg, and prints how far the
// phone had turned by each tenth of a second, in degrees clockwise: the clip's `roll` in
// _data/trivia.yml, if it turned enough to be worth turning the clip back. The angles
// come from lining up each frame with the one before it (Vision), added up and smoothed.
// With `arm` at the end, it also makes the hair on the arm in the bird clip less plain
// (where and when: `arm` below).
//
// If Swift stops at "redefinition of module 'SwiftBridging'", the Command Line Tools have
// an old module.modulemap in usr/include/swift; point the compiler at an empty file in
// its place with a VFS overlay (-vfsoverlay o.yaml -Xcc -ivfsoverlay -Xcc o.yaml).

import AVFoundation
import AppKit
import CoreImage
import Vision

let width = 1080, height = 1920, bitRate = 4_500_000
let args = CommandLine.arguments
guard args.count == 5 || args.count == 6 && args[5] == "arm",
      let start = Double(args[3]), let duration = Double(args[4]) else {
    print("usage: swift scripts/trivia_clip.swift <video> <output name> <start> <duration> [arm]")
    exit(1)
}
let source = URL(fileURLWithPath: args[1])
let clip = URL(fileURLWithPath: args[2] + ".mp4")
let poster = URL(fileURLWithPath: args[2] + ".jpg")
let rec709: [String: Any] = [
    AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
    AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
    AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2,
]

// Where the hair on the forearm shows in the bird clip (`arm` at the end of the command),
// from and until how many seconds into it and in what part of the frame (fractions of it,
// from the bottom left, as Core Image counts): on the skin, once the bird is on the arm,
// and lit from behind beyond its top edge while the phone turns.
typealias Stretch = (from: Double, until: Double, area: CGRect)
let arm: (skin: Stretch, edge: Stretch) = (
    skin: (from: 3.6, until: 10, area: CGRect(x: 0.58, y: 0.5, width: 0.42, height: 0.5)),
    edge: (from: 4.6, until: 7.3, area: CGRect(x: 0.68, y: 0.66, width: 0.32, height: 0.34))
)
let smoothingArm = args.count == 6

// How much of a stretch `time` is in, from 0 to 1, easing in and out over 0.3 seconds.
func within(_ stretch: Stretch, _ time: Double) -> Double {
    min(max((time - stretch.from + 0.3) / 0.3, 0), 1) * min(max((stretch.until - time) / 0.3, 0), 1)
}

// White in `area` of `extent` (fractions of it), black elsewhere, with soft edges.
func window(_ area: CGRect, _ extent: CGRect) -> CIImage {
    CIImage(color: .white)
        .cropped(to: CGRect(x: extent.width * area.minX, y: extent.height * area.minY,
                            width: extent.width * area.width, height: extent.height * area.height))
        .composited(over: CIImage(color: .black))
        .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: 30])
        .cropped(to: extent)
}

// A color cube for Core Image giving how much each color (0 to 255 a channel) is of a kind,
// from 0 to 1.
func colorCube(_ kind: (Double, Double, Double) -> Double) -> Data {
    let n = 32
    var cube = [Float]()
    cube.reserveCapacity(n * n * n * 4)
    for b in 0..<n {
        for g in 0..<n {
            for r in 0..<n {
                let m = Float(kind(Double(r) * 255 / Double(n - 1), Double(g) * 255 / Double(n - 1), Double(b) * 255 / Double(n - 1)))
                cube += [m, m, m, 1]
            }
        }
    }
    return cube.withUnsafeBufferPointer { Data(buffer: $0) }
}

func ramp(_ a: Double, _ b: Double, _ x: Double) -> Double {
    let t = min(max((x - a) / (b - a), 0), 1)
    return t * t * (3 - 2 * t)
}

// Skin: warm, not too dark, and pinker than the sandstone behind (green nearer blue than red).
let skinCube = colorCube { r, g, b in
    let span = r - b
    let hue = span > 0 ? (g - b) / span : 1
    return ramp(18, 32, span) * (1 - ramp(0.36, 0.46, hue)) * ramp(-0.4, -0.25, hue) * ramp(85, 115, 0.299 * r + 0.587 * g + 0.114 * b)
}

// Bright: sunlit skin, washed out to white, and the like.
let brightCube = colorCube { r, g, b in
    ramp(150, 175, 0.299 * r + 0.587 * g + 0.114 * b) * (1 - ramp(60, 90, max(r, g, b) - min(r, g, b)))
}

// How much to darken a color standing out against the dark beyond the arm, as its hair
// does: more the lighter it is, so the hair sinks into the dark around it.
let lightCube = colorCube { r, g, b in
    ramp(85, 170, 0.299 * r + 0.587 * g + 0.114 * b)
}

func lookUp(_ image: CIImage, _ cube: Data) -> CIImage {
    image.applyingFilter("CIColorCube", parameters: [
        "inputCubeDimension": 32,
        "inputCubeData": cube,
    ])
}

func scaled(_ mask: CIImage, _ amount: Double) -> CIImage {
    let a = CGFloat(amount)
    return mask.applyingFilter("CIColorMatrix", parameters: [
        "inputRVector": CIVector(x: a, y: 0, z: 0, w: 0),
        "inputGVector": CIVector(x: 0, y: a, z: 0, w: 0),
        "inputBVector": CIVector(x: 0, y: 0, z: a, w: 0),
    ])
}

// The hair on the forearm, made less plain: the thin dark strands on the skin smoothed
// away (in `arm.skin`), and the light ones standing out from its edge darkened into the dark
// beyond (in `arm.edge`), in a band around the arm's solid body (the skin, with anything thin
// taken off). Darkened rather than filtered away, the bird's foot where it crosses the band
// keeps its scales. `skinAmount` and `edgeAmount`, from 0 to 1, ease each in and out.
func smoothArm(_ frame: CIImage, skinAmount: Double, edgeAmount: Double) -> CIImage {
    let extent = frame.extent
    let skin = lookUp(frame, skinCube).clampedToExtent()
    var picture = frame
    if skinAmount > 0 {
        let onSkin = skin
            .applyingFilter("CIMultiplyCompositing", parameters: [kCIInputBackgroundImageKey: window(arm.skin.area, extent)])
            .applyingFilter("CIMorphologyMinimum", parameters: [kCIInputRadiusKey: 3])  // no specks
            .applyingFilter("CIMorphologyMaximum", parameters: [kCIInputRadiusKey: 8])
            .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: 5])
            .cropped(to: extent)
        let smooth = frame.clampedToExtent()
            .applyingFilter("CIMorphologyMinimum", parameters: [kCIInputRadiusKey: 2.5])  // light strands
            .applyingFilter("CIMorphologyMaximum", parameters: [kCIInputRadiusKey: 2.5])
            .applyingFilter("CIMorphologyMaximum", parameters: [kCIInputRadiusKey: 1.5])  // dark ones
            .applyingFilter("CIMorphologyMinimum", parameters: [kCIInputRadiusKey: 1.5])
            .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: 1.2])
            .cropped(to: extent)
        picture = smooth.applyingFilter("CIBlendWithMask", parameters: [
            kCIInputBackgroundImageKey: picture,
            kCIInputMaskImageKey: scaled(onSkin, skinAmount),
        ])
    }
    if edgeAmount > 0 {
        let body = lookUp(frame, brightCube)
            .applyingFilter("CIMaximumCompositing", parameters: [kCIInputBackgroundImageKey: skin])
            .clampedToExtent()
            .applyingFilter("CIMorphologyMinimum", parameters: [kCIInputRadiusKey: 18])  // the hair, with
            .applyingFilter("CIMorphologyMaximum", parameters: [kCIInputRadiusKey: 18])  // gaps, falls off
        let outside = body
            .applyingFilter("CIMorphologyMaximum", parameters: [kCIInputRadiusKey: 5])
            .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: 2])
            .applyingFilter("CIColorInvert")
        let band = body
            .applyingFilter("CIMorphologyMaximum", parameters: [kCIInputRadiusKey: 42])
            .applyingFilter("CIMultiplyCompositing", parameters: [kCIInputBackgroundImageKey: outside])
            .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: 4])
            .cropped(to: extent)
            .applyingFilter("CIMultiplyCompositing", parameters: [kCIInputBackgroundImageKey: window(arm.edge.area, extent)])
        let lightHair = lookUp(frame, lightCube)
            .applyingFilter("CIMultiplyCompositing", parameters: [kCIInputBackgroundImageKey: band])
            .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: 1.5])
            .cropped(to: extent)
        let dimmed = picture.clampedToExtent()
            .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: 1.2])
            .cropped(to: extent)
            .applyingFilter("CIColorMatrix", parameters: [
                "inputRVector": CIVector(x: 0.28, y: 0, z: 0, w: 0),
                "inputGVector": CIVector(x: 0, y: 0.28, z: 0, w: 0),
                "inputBVector": CIVector(x: 0, y: 0, z: 0.28, w: 0),
            ])
        picture = dimmed.applyingFilter("CIBlendWithMask", parameters: [
            kCIInputBackgroundImageKey: picture,
            kCIInputMaskImageKey: scaled(lightHair, edgeAmount),
        ])
    }
    return picture
}

// The part from `start`, upright and scaled to width x height, in Rec. 709 color.
func cut() async throws {
    let asset = AVURLAsset(url: source)
    let track = try await asset.loadTracks(withMediaType: .video)[0]
    let size = try await track.load(.naturalSize)
    let turn = try await track.load(.preferredTransform)
    let upright = CGRect(origin: .zero, size: size).applying(turn)
    let scale = CGFloat(width) / abs(upright.width)
    let range = CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 600),
                            duration: CMTime(seconds: duration, preferredTimescale: 600))

    let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: track)
    layer.setTransform(turn.concatenating(CGAffineTransform(scaleX: scale, y: scale)), at: .zero)
    let instruction = AVMutableVideoCompositionInstruction()
    instruction.timeRange = CMTimeRange(start: .zero, duration: try await asset.load(.duration))
    instruction.layerInstructions = [layer]
    let composition = AVMutableVideoComposition()
    composition.renderSize = CGSize(width: width, height: height)
    composition.frameDuration = CMTime(value: 1, timescale: 30)
    composition.instructions = [instruction]
    composition.colorPrimaries = AVVideoColorPrimaries_ITU_R_709_2
    composition.colorTransferFunction = AVVideoTransferFunction_ITU_R_709_2
    composition.colorYCbCrMatrix = AVVideoYCbCrMatrix_ITU_R_709_2

    let reader = try AVAssetReader(asset: asset)
    reader.timeRange = range
    let output = AVAssetReaderVideoCompositionOutput(videoTracks: [track], videoSettings: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    ])
    output.videoComposition = composition
    reader.add(output)

    try? FileManager.default.removeItem(at: clip)
    let writer = try AVAssetWriter(outputURL: clip, fileType: .mp4)
    writer.shouldOptimizeForNetworkUse = true  // playable before it has all loaded
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoColorPropertiesKey: rec709,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: bitRate,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
            AVVideoMaxKeyFrameIntervalKey: 60,
        ],
    ])
    input.expectsMediaDataInRealTime = false
    let frames = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height,
    ])
    writer.add(input)
    // Pixel values as they are, without color management, which the smoothing doesn't need.
    let context = CIContext(options: [.workingColorSpace: NSNull(), .outputColorSpace: NSNull()])

    reader.startReading()
    writer.startWriting()
    writer.startSession(atSourceTime: .zero)
    var first: CMTime?
    while let sample = output.copyNextSampleBuffer() {
        guard let pixels = CMSampleBufferGetImageBuffer(sample) else { continue }
        while !input.isReadyForMoreMediaData {
            try await Task.sleep(nanoseconds: 2_000_000)
        }
        let time = CMSampleBufferGetPresentationTimeStamp(sample)
        first = first ?? time
        let at = (time - first!).seconds  // the clip starts at 0
        var frame = pixels
        let skinAmount = smoothingArm ? within(arm.skin, at) : 0
        let edgeAmount = smoothingArm ? within(arm.edge, at) : 0
        if skinAmount > 0 || edgeAmount > 0, let pool = frames.pixelBufferPool {
            var smoothed: CVPixelBuffer?
            CVPixelBufferPoolCreatePixelBuffer(nil, pool, &smoothed)
            if let smoothed {
                let picture = CIImage(cvPixelBuffer: pixels, options: [.colorSpace: NSNull()])
                context.render(smoothArm(picture, skinAmount: skinAmount, edgeAmount: edgeAmount), to: smoothed)
                frame = smoothed
            }
        }
        frames.append(frame, withPresentationTime: time - first!)
    }
    input.markAsFinished()
    await writer.finishWriting()
    if writer.status != .completed {
        throw writer.error ?? CocoaError(.fileWriteUnknown)
    }
}

func savePoster() async throws {
    let images = AVAssetImageGenerator(asset: AVURLAsset(url: clip))
    images.requestedTimeToleranceAfter = .zero
    let (frame, _) = try await images.image(at: .zero)
    let jpeg = NSBitmapImageRep(cgImage: frame).representation(using: .jpeg, properties: [.compressionFactor: 0.8])!
    try jpeg.write(to: poster)
}

// How far the phone had turned, clockwise in degrees, every tenth of a second of the clip.
func roll() async throws -> [Double] {
    let asset = AVURLAsset(url: clip)
    let reader = try AVAssetReader(asset: asset)
    let output = AVAssetReaderTrackOutput(track: try await asset.loadTracks(withMediaType: .video)[0],
                                          outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
    reader.add(output)
    reader.startReading()
    let context = CIContext()
    var times = [0.0], angles = [0.0]
    var previous: CGImage?
    while let sample = output.copyNextSampleBuffer() {
        guard let pixels = CMSampleBufferGetImageBuffer(sample) else { continue }
        let small = CIImage(cvPixelBuffer: pixels).transformed(by: CGAffineTransform(scaleX: 0.5, y: 0.5))
        guard let frame = context.createCGImage(small, from: small.extent.integral, format: .RGBA8,
                                                colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!) else { continue }
        if let previous {
            // Vision gives the transform that lays this frame over the one before: it turns
            // the picture back the way the phone turned, clockwise, which is a negative
            // angle in Vision's coordinates (y up).
            let request = VNHomographicImageRegistrationRequest(targetedCGImage: frame)
            try VNImageRequestHandler(cgImage: previous).perform([request])
            var step = 0.0
            if let match = request.results?.first as? VNImageHomographicAlignmentObservation {
                let m = match.warpTransform
                step = -atan2(Double(m[0][1] - m[1][0]), Double(m[0][0] + m[1][1])) * 180 / .pi
            }
            times.append(CMSampleBufferGetPresentationTimeStamp(sample).seconds)
            angles.append(angles.last! + step)
        }
        previous = frame
    }
    // Smoothed over a few frames, so the frame turns without shaking.
    let smooth = angles.indices.map { i -> Double in
        var total = 0.0, weights = 0.0
        for j in max(0, i - 9)...min(angles.count - 1, i + 9) {
            let w = exp(-pow(Double(j - i) / 3, 2) / 2)
            total += w * angles[j]
            weights += w
        }
        return total / weights
    }
    return stride(from: 0.0, through: times.last!, by: 0.1).map { t in
        let i = max(1, times.firstIndex { $0 >= t } ?? times.count - 1)
        let f = (t - times[i - 1]) / (times[i] - times[i - 1])
        return smooth[i - 1] + (smooth[i] - smooth[i - 1]) * min(max(f, 0), 1)
    }
}

let done = DispatchSemaphore(value: 0)
Task {
    do {
        try await cut()
        try await savePoster()
        let angles = try await roll()
        print("Wrote \(clip.path) and \(poster.path)")
        print("roll: [" + angles.map { String(format: "%.1f", $0) }.joined(separator: ", ") + "]")
    } catch {
        print("Failed: \(error)")
        exit(1)
    }
    done.signal()
}
done.wait()
