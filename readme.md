# Image Color Quantization Web App

A client-side web application for reducing the number of colors in images using different quantization algorithms.

## Features

- **Client-side processing:** All image processing happens in your browser - no server uploads required
- **Two quantization algorithms for now:** K-means and Mean shift
- **Real-time preview:** See results immediately after processing
- **No automatic download:** use the browser's save image feature for downloading.

## Getting started

1. Build the script
   Use any TypeScript bundler (e.g., esbuild, tsup, bun builder) to bundle wit entry point `./dist/bundle.js`. For example, using esbuild:
```bash
esbuild ./src/index.ts --bundle --outfile=./dist/bundle.js
```

2. Create an HTML file
   Minimal setup – just include the bundled script. An example file is provided in `./index.html`.

3. Style it (optional but recommended)
   For the best user experience, include the provided `./style.css`.

## Technical Details
- Built entirely with client-side JavaScript/TypeScript, no server needed even.
- No external dependencies
- Uses `OffscreenCanvas` API for image processing

## License

This project is provided as-is for educational and demonstration purposes.

## Contributing

As this is a hobby demonstration project, contributions are most probably not currently being accepted. However, feel free to fork and modify for your own purposes.