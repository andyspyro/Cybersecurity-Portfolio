# Digital Image Forensics and Photo Provenance Analysis

## Project Overview

This project documents a forensic examination of a derivative JPEG image using a Linux/WSL workflow. The objective was to determine what could be established about the image's provenance, original capture device, processing history, compression, metadata, and possible manipulation from the file itself.

The investigation intentionally separates **direct evidence**, **reasonable inference**, and **unsupported conclusions**. The examined copy had passed through a messaging workflow and no longer contained the rich camera metadata normally available in an original smartphone photograph. Rather than treating missing metadata as proof of a particular origin, I used multiple independent tools to characterize the surviving artifacts and determine the limits of attribution.

> **Privacy note:** The original evidence image is intentionally not included in this public repository. This write-up contains only sanitized technical findings.

## Investigation Goals

The analysis focused on the following questions:

- What metadata survived in the JPEG?
- Can the original camera make or model be recovered?
- Is there evidence of an Apple imaging or color-management workflow?
- What can JPEG structure and compression reveal about processing?
- Does the file contain embedded or appended data?
- Can error-level analysis establish whether a visible region was digitally inserted?
- Can sensor-noise analysis identify the originating camera?
- What conclusions are supportable when working with a resized/recompressed derivative rather than the original camera file?

## Environment and Tooling

The investigation was performed in **WSL/Linux** and used:

- ExifTool
- ImageMagick
- jpeginfo
- binwalk
- strings
- Python 3
- OpenCV
- Pillow
- libjpeg-turbo / jpegtran
- SHA-256 and MD5 hashing
- FFT and pixel-correlation experiments
- JPEG block-grid analysis
- noise-residual / introductory PRNU analysis

## Evidence Preservation

Before deeper analysis, the evidence workflow emphasized preserving the questioned image and working from copies. A cryptographic hash can be generated with:

```bash
sha256sum evidence.jpg
```

A cryptographic hash provides a reproducible identifier for the exact byte sequence examined. Any later modification to the file produces a different hash.

## 1. Metadata Examination

The initial comprehensive metadata extraction used:

```bash
exiftool -a -u -g1 evidence.jpg
```

The examined derivative was a **1477 × 1108 JPEG**. Only minimal EXIF information survived. The remaining EXIF structure contained basic orientation, resolution, and image-dimension information.

A targeted search for original camera information was performed with:

```bash
exiftool -Make -Model -LensModel -Software -DateTimeOriginal evidence.jpg
```

No values were returned.

The following original-capture fields were therefore **not present in the examined copy**:

- camera manufacturer
- camera/phone model
- lens model
- original capture timestamp
- ISO
- shutter/exposure time
- aperture
- focal length
- GPS coordinates
- camera software identifier

### Finding

The derivative does not contain sufficient EXIF metadata to directly identify the original camera or phone. Missing EXIF cannot be reconstructed merely by running additional metadata parsers because the values themselves are no longer stored in the file.

## 2. Apple Display P3 ICC Profile

ExifTool identified an embedded ICC color profile containing:

```text
Profile Creator:     Apple Computer Inc.
Profile Description: Display P3
Copyright:           Copyright Apple Inc., 2022
```

The ICC profile was extracted separately:

```bash
exiftool -b -ICC_Profile evidence.jpg > profile.icc
md5sum profile.icc
sha256sum profile.icc
```

This allowed the profile itself to be treated as a separate forensic artifact.

### Interpretation

The embedded profile establishes the presence of an **Apple-authored Display P3 color profile** in the examined JPEG. This is consistent with an Apple-associated color-management or image-processing workflow.

It does **not**, by itself, prove that an iPhone captured the photograph. ICC profiles describe color interpretation and can survive or be introduced during processing, conversion, export, or transmission. They are also shared across devices and are not unique sensor identifiers.

A suspected iPhone 15 origin was therefore treated as a **hypothesis**, not a conclusion.

## 3. JPEG Encoding Characteristics

The final JPEG encoding was characterized with:

```bash
exiftool -JPEGQualityEstimate -YCbCrSubSampling -EncodingProcess evidence.jpg
```

Observed characteristics included:

```text
JPEG Quality Estimate: 91
YCbCr Sub Sampling:     YCbCr 4:2:0
Encoding Process:       Baseline DCT, Huffman coding
JFIF Version:           1.01
EXIF Byte Order:        Big-endian (Motorola)
```

The JPEG quality value is an estimate derived from the quantization tables rather than proof of the exact quality setting selected by a user or application.

### Quantization Tables

Pillow was used to extract the JPEG quantization tables. The tables showed a regular high-quality JPEG encoding pattern compatible with the quality estimate.

Quantization tables characterize the **current JPEG encoding**. They cannot independently prove the identity of the original camera, particularly when an image may have been resized and recompressed by a messaging application.

## 4. JPEG Structural Analysis

The internal JPEG structure was inspected with ExifTool's HTML dump:

```bash
exiftool -htmlDump evidence.jpg > dump.html
```

The structure included:

- JPEG/JFIF header
- APP1 EXIF segment
- TIFF header
- minimal IFD0 / EXIF IFD entries
- APP13 Photoshop-format resource segment
- APP2 ICC profile
- quantization tables
- Huffman tables
- baseline JPEG image data
- normal JPEG end-of-image marker

### Photoshop APP13 Finding

A Photoshop-format APP13 resource structure was present.

This does **not** establish that a person edited the image in Adobe Photoshop. Photoshop-format resource blocks can be generated or retained by multiple image-processing pipelines. The correct conclusion is simply that a Photoshop-compatible APP13 metadata structure exists.

## 5. Embedded Data / File Carving Checks

The file was checked with binwalk:

```bash
binwalk evidence.jpg
```

The scan identified the JPEG itself and did not reveal an obvious second embedded archive, executable, or appended image.

Printable strings were also examined:

```bash
strings -n 6 evidence.jpg | less
```

Meaningful strings corresponded primarily to known JPEG metadata structures such as the ICC profile and Photoshop resource container. Other printable sequences were consistent with chance strings inside compressed JPEG data.

### Finding

No obvious hidden or appended secondary file was identified.

## 6. Structural Integrity

The JPEG was validated using:

```bash
jpeginfo -c evidence.jpg
```

The image was reported as structurally valid.

This supports the conclusion that the examined copy was not obviously truncated or corrupt. Structural validity does **not** establish authenticity or prove that the pixels were never edited.

## 7. Dimensions and Resampling

The image measured:

```text
1477 × 1108 pixels
```

The aspect ratio is approximately:

```text
1477 / 1108 ≈ 1.33303
```

This is very close to 4:3, a common camera aspect ratio, while the unusual low dimensions are consistent with a resized derivative rather than a modern smartphone camera master.

This does not recover the original dimensions or identify the application responsible for resizing.

## 8. JPEG Block-Grid Analysis

Pixel discontinuities were measured at each possible offset of the JPEG 8 × 8 block grid. Elevated discontinuity at the expected block boundary was observed in both horizontal and vertical measurements.

### Interpretation

This confirms the expected block structure of the current JPEG encoding.

It does **not** prove double compression. JPEG block artifacts are expected in ordinary JPEG files, so block-grid evidence must not be overstated.

## 9. Error-Level Analysis

A recompressed comparison image and amplified difference image were generated using ImageMagick:

```bash
convert evidence.jpg recompressed.jpg -compose difference -composite diff.png
convert diff.png -auto-level -evaluate multiply 10 ela.png
```

The resulting error-level visualization was inspected for conspicuous localized compression differences.

### Important Limitation

ELA is **not an authentication test**. A uniformly recompressed image can suppress evidence of earlier edits, while normal image content can produce apparent anomalies.

The defensible conclusion was:

> The preliminary compression examination did not establish an obvious localized compression inconsistency demonstrating that a specific visible region had been digitally inserted.

It would be incorrect to translate this into "the image was proven unedited."

## 10. Noise Residual Analysis

An introductory noise-residual experiment was performed with OpenCV. A smoothed version of the image was subtracted from the image to isolate high-frequency residual information.

Observed residual standard deviations were approximately:

```text
Blue:  8.861
Green: 8.832
Red:   8.832
```

The similar channel values showed that the residual extraction was functioning, but the residual contains a mixture of:

- sensor noise
- JPEG compression artifacts
- image sharpening
- denoising
- fine scene detail
- resizing/transmission artifacts

### PRNU Lesson

A single residual image is **not** a camera fingerprint lookup.

Photo Response Non-Uniformity (PRNU) becomes substantially more useful when multiple known original photographs from a candidate physical camera are available. Residuals from those reference photographs can be combined into a sensor fingerprint and compared against the questioned image.

Because no candidate physical phone and no reference originals were available, PRNU could not responsibly identify the originating device in this investigation.

## 11. Testing an iPhone 15 Hypothesis

The presence of the Apple Display P3 profile made an Apple-associated workflow a reasonable avenue to investigate. An iPhone 15 was considered as a possible source.

The evidence was handled conservatively:

| Artifact | Interpretation |
|---|---|
| Apple Display P3 ICC profile | Consistent with Apple-associated processing |
| Near-4:3 aspect ratio | Compatible with smartphone photography but nonspecific |
| Modern JPEG processing | Compatible with smartphone output but nonspecific |
| Camera Make = Apple | Not present |
| Camera Model = iPhone 15 | Not present |
| Apple lens metadata | Not present |
| Original exposure metadata | Not present |
| Original GPS/time | Not present |
| Device-specific PRNU reference | Not available |

### Conclusion on Device Attribution

The surviving artifacts do not establish that the photograph was captured by an iPhone 15.

The file is **compatible with** an Apple-associated imaging/processing workflow, but compatibility is not attribution. A non-Apple capture could theoretically acquire the same color profile during later processing.

Stronger attribution would require one of the following:

1. an earlier/original-generation copy retaining camera EXIF;
2. controlled comparison images produced by a known iPhone 15 and passed through the same transmission workflow; or
3. preferably, multiple original reference photographs from the suspected physical device for sensor-fingerprint comparison.

## 12. What I Learned

This exercise demonstrated that digital-image forensics is less about finding one magic command and more about combining independent artifacts while understanding what each artifact can and cannot prove.

Key lessons included:

- **Metadata is evidence, not ground truth.** It can be removed, rewritten, or introduced during processing.
- **Absence of metadata is not evidence against a device.** A messaging or export workflow may strip camera fields.
- **ICC profiles describe color management, not camera identity.**
- **JPEG quantization tables and marker structures describe encoding pipelines more readily than physical cameras after recompression.**
- **ELA can highlight compression differences but cannot authenticate an image.**
- **8 × 8 JPEG block artifacts are normal and cannot automatically be treated as evidence of double compression.**
- **PRNU is comparative.** Device attribution requires reference material from candidate sensors.
- **A derivative image can destroy provenance information permanently.** Deleted EXIF cannot simply be reconstructed from the remaining pixels.
- **Forensic reporting must separate observation from inference.** "Apple Display P3 profile present" is an observation; "an iPhone captured the image" would be an unsupported inference without additional evidence.
- **Negative findings matter.** Establishing that no camera model, GPS, timestamp, hidden payload, or device-specific identifier survives prevents unsupported conclusions.

## Forensic Conclusion

The examined JPEG is a resized/reprocessed derivative containing minimal EXIF metadata, standard high-quality JPEG compression characteristics, a Photoshop-compatible APP13 metadata structure, and an Apple-authored 2022 Display P3 ICC color profile.

No surviving metadata directly identifies the original camera make, model, lens, capture timestamp, exposure settings, or GPS location. No obvious secondary embedded file was identified. Preliminary compression and error-level examination did not establish a localized inconsistency sufficient to demonstrate digital insertion, but these methods cannot authenticate the image or rule out prior modification.

The Apple ICC profile is a meaningful provenance artifact and supports an Apple-associated color-management or processing stage. It is not sufficient to attribute capture to an iPhone generally or an iPhone 15 specifically.

The investigation therefore demonstrates both practical forensic analysis and an equally important forensic skill: **knowing when the available evidence no longer supports a stronger conclusion.**

## Skills Demonstrated

`Digital Forensics` · `Image Forensics` · `Metadata Analysis` · `EXIF` · `ICC Profiles` · `JPEG Internals` · `Compression Analysis` · `Error-Level Analysis` · `PRNU Fundamentals` · `OpenCV` · `Python` · `Pillow` · `ExifTool` · `ImageMagick` · `Binwalk` · `Linux` · `WSL` · `Evidence Preservation` · `Cryptographic Hashing` · `Technical Reporting`

## Ethical Scope

This project documents analysis of a lawfully possessed image for educational and forensic-learning purposes. No attempt was made to access another person's device, account, private communications, or restricted system. The public repository intentionally excludes the original evidence image and potentially identifying content.
