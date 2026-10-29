---
title: "HilbertGen-3D: Hilbert–Multifractal Conditioning for Topology-Aware 3D Generation"
collection: publications
category: conferences
permalink: /publication/2026-hilbertgen-3d
date: 2026-10-15
venue: 'Advances in Neural Information Processing Systems (NeurIPS)'
paperurl: 'https://arxiv.org/abs/2610.22720'
citation: '<b>Z. Zhang</b>, S. Li, Y. Nakahira, P. Bogdan, and G. Qu. &quot;HilbertGen-3D: Hilbert–Multifractal Conditioning for Topology-Aware 3D Generation.&quot; <i>Advances in Neural Information Processing Systems (NeurIPS)</i>, 2026 (to appear).'
---

High-fidelity 3D generative modeling underpins game asset creation, medical imaging, and VR/AR environmental design, where geometric structure directly influences perception and decision-making. Diffusion models represent a powerful paradigm for point cloud generation. However, existing approaches rely heavily on local voxel or patch features and often miss global structural organization, and much less work has studied how global conditioning can be used to improve generation quality. In this paper, we introduce HilbertGen-3D, a novel topology-aware conditional diffusion framework based on Hilbert-Multifractal Conditioning (HMC). HMC computes multi-scale voxel measures, serializes them via a 3D Hilbert curve to expose structured spatial dependencies, and estimates the generalized fractal dimensions from scale-dependent partition functions. We encode these signals as global embeddings and multi-scale tokens, and inject them into a diffusion denoiser through an efficient bottleneck fusion module. Across the Chair, Airplane, and Car categories of ShapeNet, our two conditioning variants reduce the absolute deviation of 1-Nearest Neighbor Accuracy (1-NNA) from 50% by up to 8.90 percentage points and increase coverage by up to 5.88 percentage points relative to TopoDiT-3D. This shows that combining local density cues with global Hilbert-multifractal structure provides a simple and effective recipe for high-fidelity and diverse 3D generation.
