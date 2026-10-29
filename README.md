# ziyi-zhang.com

Source for [ziyi-zhang.com](https://ziyi-zhang.com), built with Jekyll. It started from the
[Academic Pages](https://github.com/academicpages/academicpages.github.io) template; its design
now follows [Yingsi Qin's website](https://yingsiqin.github.io).
GitHub Actions (`.github/workflows/jekyll.yml`) builds and deploys the site on every push to `master`.

## Where things live

| What | File |
| --- | --- |
| Name, photo, position, email and links in the column at the left | `_config.yml` (`author:` block) |
| Faded photo behind the home, CV and paper pages | `_config.yml` (`backdrop:`) |
| Home page: the About Me text and the list of sections | `_pages/about.md` |
| Education, experience, teaching, skills | `_data/cv.yml`, shown on the CV page (`_pages/cv.md`); the home page shows the experience and teaching too |
| Publications | one file per paper in `_publications/`; `category:` is `conferences`, `manuscripts` (journals) or `preprints`, and `cover:` is its picture in `images/papers/` |
| Menu at the top | `_data/navigation.yml` |
| PDFs and images | `files/`, `images/` |
| Travel and Scale Models pages | `_data/travel.yml`, `_data/models.yml` (one entry per photo or clip); the format is in `_layouts/gallery.html`, `_sass/_gallery.scss` and `assets/js/gallery.js` |
| The look of every page | `_layouts/`, `_includes/`, `_sass/` (colors and fonts in `_sass/_base.scss`) and `assets/js/site.js` |

## Adding a paper

Add a file to `_publications/` like the others. Its text is the abstract (the Abstract button and
its own page show it), and the start of its `citation:`, up to the title in quotes, is the list of
authors. Besides `paperurl:`, a paper can have `codeurl:`, `slidesurl:` and `bibtexurl:`, each
shown as a button.

The cover is a 16:9 picture in `images/papers/`, named in `cover:`; a paper without one is listed
without a picture. The current covers are drawn by `scripts/paper_covers.py` (needs numpy and
matplotlib), and a figure from the paper can take the place of any of them.

## Adding to the Travel and Scale Models pages

The originals go in `photography/` (Travel) or `scaled_models/` (Scale Models), named like
`2023-07-22-machu-picchu.heic`. Both folders are kept out of git and out of the site, which
uses the smaller copies in `images/travel/` and `images/models/`.

For a photo, run `python3 scripts/gallery_images.py` (macOS, needs Pillow) to make the copies,
then add an entry for it to the data file, which explains its fields. To take a photo off the
site, delete its entry and its copies, and move the original into a folder inside
`photography/` or `scaled_models/` (such as `photography/not-on-site/`), which the script skips.

For a clip, put an H.264 `.mp4` of about 10 seconds in `images/travel/` or `images/models/`, with
a still from it saved as a `.jpg` of the same name (shown until the clip loads), and add an entry
with `video: true`. The built-in
macOS `avconvert` can trim one, though its files are larger than the current clips (2–4 MB):

```bash
avconvert --source photography/my-clip.mov --preset Preset960x540 --start 12 --duration 10 --output images/travel/my-clip.mp4
```

## Run locally

Needs Ruby 3.3 (`brew install ruby@3.3`).

```bash
export PATH="/opt/homebrew/opt/ruby@3.3/bin:$PATH" LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
bundle config set --local path vendor/bundle
bundle install
bundle exec jekyll serve --livereload
```

Then open <http://localhost:4000>. Restart it after changing `_config.yml`, which Jekyll reads only
when it starts.
