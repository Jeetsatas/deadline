# DEADLINE — PRODUCTIVITY TOOLS REPOSITORY EVALUATION

**Date:** November 2026  
**Document Version:** 1.0.0  
**Target Architecture:** Deadline Universal Productivity Tools Hub (Browser-First, Zero-Telemetry, Privacy-Preserving)

---

## Executive Evaluation Summary

Deadline's Phase 6 introduces an integrated, universal productivity toolkit designed for students, researchers, knowledge workers, creators, and engineers. To ensure maximum data privacy, zero external transmission of sensitive documents, and seamless offline execution, this evaluation analyzes 11 leading open-source candidate projects and modern alternatives against strict criteria:

1. **Licensing & Commercial Use Restrictions:** Compatibility with open-source and commercial distributions without viral copyleft contamination.
2. **Execution Boundary:** Client-side WebAssembly / JavaScript execution vs. server containerization (Docker).
3. **Security & Sandbox Isolation:** Zero credential leakage, memory safety, and sanitization of user-uploaded files.
4. **Bundle & Performance Footprint:** Dynamic lazy-loading feasibility without inflating Deadline's initial bundle.

---

## Detailed Candidate Evaluations

### 1. Hopding/pdf-lib
- **Repository URL:** https://github.com/Hopding/pdf-lib
- **Purpose:** Pure TypeScript/JavaScript library for creating, modifying, merging, splitting, rotating, watermarking, and restructuring PDF documents directly in any JavaScript runtime.
- **License:** **MIT License** (Fully permissive, commercial-friendly, no copyleft restrictions).
- **Integration Approach:** **Direct NPM Package (`pdf-lib`)**. Executed 100% in-browser via WebAssembly / TypedArrays without network requests.
- **Advantages:**
  - 100% client-side execution; documents never leave user RAM.
  - No external binary, Java runtime, or headless browser required.
  - Robust support for PDF page extraction, merging, rotation, insertion, and text/image embedding.
  - Extremely lightweight compared to backend PDF suites (~300 KB gzip).
- **Limitations:**
  - Does not include a full rasterizer (cannot render PDF pages to HTML canvas on its own without PDF.js).
  - Advanced PDF form flattening and complex vector shading have edge-case quirks.
- **Security Concerns:** Negligible. Runs sandboxed in browser memory; prevents SSRF and server execution vulnerabilities.
- **Recommendation:** **ADOPT (Stage 1 Core)**. Powers Deadline's browser-local PDF merge, split, rotate, page reordering, watermark, and image-to-PDF tools.

---

### 2. mozilla/pdf.js
- **Repository URL:** https://github.com/mozilla/pdf.js
- **Purpose:** General-purpose, web standards-compliant platform for parsing and rendering PDF documents onto HTML5 Canvas.
- **License:** **Apache License 2.0** (Permissive, commercial-friendly).
- **Integration Approach:** **Dynamic NPM Package / Web Worker**. Lazy-loaded when PDF viewing, thumbnail generation, or page rendering is requested.
- **Advantages:**
  - The gold standard for in-browser PDF rendering (used natively by Firefox).
  - High fidelity text layer extraction and font subsetting.
  - Dedicated Web Worker execution keeps UI thread at 60 FPS.
- **Limitations:**
  - Read/render only; cannot modify or write back PDF binary structures without external tools.
  - Worker bundle is relatively heavy (~1.5 MB uncompressed).
- **Security Concerns:** Low. Mozilla has hardened pdf.js against malicious font exploits and malformed streams.
- **Recommendation:** **ADOPT (Stage 1 Rendering & Stage 2 Viewer)**. Used for PDF page preview grids, thumbnail extraction, and text extraction.

---

### 3. Stirling-Tools/Stirling-PDF
- **Repository URL:** https://github.com/Stirling-Tools/Stirling-PDF
- **Purpose:** Comprehensive self-hosted web-based PDF manipulation application providing 40+ operations (OCR, redaction, convert, sanitization).
- **License:** **GPLv3 License** (Strong copyleft. Linking or embedding backend code requires GPL distribution).
- **Integration Approach:** **External Local Daemon / Docker Sidecar via Deadline Local Bridge**.
- **Advantages:**
  - Massive breadth of PDF features including Tesseract OCR, LibreOffice format conversion, and WeasyPrint rendering.
  - Active community with continuous security patches.
- **Limitations:**
  - Requires Java 17+, LibreOffice, and Tesseract binaries; cannot run purely in the browser.
  - Docker image is heavy (~1.2 GB).
  - GPLv3 licensing prevents embedding or direct bundling into permissive codebases.
- **Security Concerns:** File processing on a shared host requires strict permission sandboxing.
- **Recommendation:** **REJECT for Core Browser Distribution; EVALUATE LATER for Bridge Power-Users**. Deadline's default experience must remain zero-setup in browser memory. Advanced features requiring Stirling can be optionally linked via loopback bridge.

---

### 4. ONLYOFFICE (DocumentServer & web-apps)
- **Repository URL:** https://github.com/ONLYOFFICE/DocumentServer / https://github.com/ONLYOFFICE/web-apps
- **Purpose:** Full-featured online office suite providing native editing for DOCX, XLSX, and PPTX documents with Microsoft Office fidelity.
- **License:** **AGPLv3 License** (Strong network copyleft. Modifications and integrations trigger source-code disclosure requirements) + Commercial Enterprise License.
- **Integration Approach:** **Self-hosted Docker Server + IFrame / Web-Apps SDK**.
- **Advantages:**
  - Highest fidelity rendering and editing of Microsoft Office binary and OpenXML documents in the industry.
  - Rich collaborative editing, track changes, and formula calculation engines.
- **Limitations:**
  - Heavy server architecture requiring Node.js, C++ core converters, Redis, RabbitMQ, and PostgreSQL.
  - AGPLv3 license creates legal friction for commercial integration without purchasing a commercial license.
  - Not feasible for standalone client-side browser execution.
- **Security Concerns:** High complexity of document parsers requires continuous CVE patching in enterprise servers.
- **Recommendation:** **EVALUATE LATER (Enterprise Extension)**. For Deadline's core, provide lightweight markdown, text comparison, and document converters locally. Full ONLYOFFICE should be an optional enterprise connector.

---

### 5. viliusle/miniPaint & koneb71/pikado
- **Repository URL:** https://github.com/viliusle/miniPaint / https://github.com/koneb71/pikado
- **Purpose:** Browser-based image editors supporting layers, filters, cropping, resizing, and drawing tools directly on HTML5 Canvas.
- **License:** **MIT License** (Both projects).
- **Integration Approach:** **Modular Canvas Component / Dynamic Module**.
- **Advantages:**
  - Pure client-side execution using standard Canvas 2D and WebGL APIs.
  - Zero server upload; all photo edits happen in local browser memory.
  - Supports layer blending, transparency, and alpha channel operations.
- **Limitations:**
  - UI conventions in miniPaint follow traditional Photoshop desktop layouts rather than modern minimalistic UX.
- **Security Concerns:** None. Completely isolated in DOM canvas context.
- **Recommendation:** **ADOPT Core Algorithms (Stage 1 / Stage 2)**. Incorporate lightweight HTML5 Canvas cropping, resizing, format conversion, and filter engines cleanly into Deadline's design system.

---

### 6. ffmpegwasm/ffmpeg.wasm
- **Repository URL:** https://github.com/ffmpegwasm/ffmpeg.wasm
- **Purpose:** WebAssembly port of the FFmpeg multimedia suite, enabling browser-local video trimming, audio extraction, format transcoding, and thumbnail generation.
- **License:** **MIT License** (Underlying FFmpeg core is LGPL 2.1+ or GPL 2.0+ depending on build flags).
- **Integration Approach:** **Web Worker with SharedArrayBuffer / WebAssembly**.
- **Advantages:**
  - True client-side audio and video conversion without uploading multi-gigabyte files to cloud servers.
  - Unmatched media format support (MP4, WebM, MP3, WAV, GIF, AAC).
- **Limitations:**
  - Multi-threaded execution requires Cross-Origin Opener Policy (`COOP: same-origin`) and Cross-Origin Embedder Policy (`COEP: require-corp`) headers.
  - Large binary download (~25-30 MB Wasm file).
  - High RAM usage; 4K video transcoding can cause browser tab crashes on lower-spec machines.
- **Security Concerns:** Media decompression vulnerabilities in FFmpeg C code ported to Wasm.
- **Recommendation:** **EVALUATE FOR STAGE 2 (Lazy-Loaded Worker)**. In Stage 1, use native browser MediaRecorder, Canvas video capture, and Web Audio API for fast client-side audio/video processing.

---

### 7. remotion-dev/remotion
- **Repository URL:** https://github.com/remotion-dev/remotion
- **Purpose:** Programmatic video creation and rendering using React and web technologies.
- **License:** **Remotion License (Business Source License / BSL-style)**:
  - *Free for individuals and small companies (up to 3 employees).*
  - *Paid commercial license required for companies with more than 3 employees.*
- **Integration Approach:** **React Video Preview / Web Audio Renderer**.
- **Advantages:**
  - Excellent React declarative workflow for generating dynamic motion graphics and video presentations.
- **Limitations:**
  - **Restrictive Commercial Licensing:** Cannot be bundled into a general-purpose permissive open-source app without warning commercial users of licensing liabilities.
  - Server-side rendering (SSR) relies on headless Chromium instances.
- **Security Concerns:** Standard headless browser resource consumption.
- **Recommendation:** **REJECT for Default Core**. The license restriction introduces legal friction for enterprise users. Deadline will use canvas and Web Video APIs for video utilities.

---

### 8. excalidraw/excalidraw
- **Repository URL:** https://github.com/excalidraw/excalidraw
- **Purpose:** Virtual collaborative whiteboard for sketching hand-drawn diagrams, flowcharts, architecture plans, and wireframes.
- **License:** **MIT License** (Fully permissive).
- **Integration Approach:** **Lazy-Loaded React Component (`@excalidraw/excalidraw`)**.
- **Advantages:**
  - Intuitive hand-drawn visual style that fits rapid ideation and milestone planning.
  - Pure client-side serialization to JSON; exports directly to SVG, PNG, and clipboard.
  - Strong offline support.
- **Limitations:**
  - Package size is relatively large (~2 MB bundle); must be strictly code-split.
- **Security Concerns:** None for local canvas rendering.
- **Recommendation:** **ADOPT (Stage 2 Diagrams & Planning)**. Provides immediate value for architecture and milestone diagrams.

---

### 9. hakimel/reveal.js
- **Repository URL:** https://github.com/hakimel/reveal.js
- **Purpose:** HTML-based presentation framework supporting nested slides, speaker notes, markdown slides, and PDF export.
- **License:** **MIT License** (Fully permissive).
- **Integration Approach:** **Client-side Slide Engine / Component**.
- **Advantages:**
  - Lightweight, responsive, and works seamlessly in all modern browsers.
  - Native markdown slide editing and live preview.
  - Clean export to PDF via browser print stylesheet.
- **Limitations:**
  - Not a drag-and-drop PPTX graphical layout editor (code/markdown-centric).
- **Security Concerns:** HTML injection must be sanitized when rendering user-entered markdown.
- **Recommendation:** **ADOPT (Stage 2 Presentations)**. Empowers users to create slide decks from approved execution milestones without heavy desktop presentation software.

---

## Final Adoption Roadmap Matrix

| Project / Tool | Target Category | License | Strategy | Delivery Phase |
| :--- | :--- | :--- | :--- | :--- |
| **pdf-lib** | PDF & Documents | MIT | In-browser WebAssembly / TypedArrays | **Stage 1 (Immediate)** |
| **pdf.js** | PDF Rendering | Apache 2.0 | Lazy Web Worker | **Stage 1 & 2** |
| **JSZip** | File & Utilities | MIT | Browser memory zip/unzip | **Stage 1 (Immediate)** |
| **QRCode / Canvas** | Utilities & Sharing | MIT | Native Canvas rendering | **Stage 1 (Immediate)** |
| **Browser Canvas** | Image & Graphics | W3C Native | HTML5 2D Canvas pipeline | **Stage 1 (Immediate)** |
| **Diff & Formatters** | Text & Office | MIT | Pure TypeScript algorithms | **Stage 1 (Immediate)** |
| **Excalidraw** | Diagrams & Planning | MIT | Code-split React Component | **Stage 2** |
| **Reveal.js** | Presentations | MIT | HTML5 presentation runner | **Stage 2** |
| **FFmpeg.wasm** | Audio / Video | MIT / LGPL | Web Worker with SharedArrayBuffer | **Stage 2** |
| **ONLYOFFICE** | Office Formats | AGPLv3 | Optional self-hosted connector | **Deferred / Enterprise** |
| **Stirling-PDF** | Batch PDF / OCR | GPLv3 | Optional local bridge container | **Deferred / Power-User** |
| **Remotion** | Programmatic Video | BSL (Custom) | Restricted licensing | **Rejected** |

---

## Security & Privacy Compliance Checklist
- [x] **Zero Telemetry Default:** User files uploaded to any Stage 1 tool are processed in local volatile RAM and never transmitted across the network.
- [x] **Safe Memory Lifecycle:** All `URL.createObjectURL` references are tracked and explicitly revoked with `URL.revokeObjectURL` upon download or session termination.
- [x] **No Secret Storage:** Passwords, tokens, or confidential document content processed in utilities are never written to disk or audit logs.
- [x] **Vault Interoperability:** Tool outputs are saved as submitted deliverables when the browser confirms durable file storage; no external verification is implied.
