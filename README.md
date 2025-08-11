For the script to run, you will need the following in the top-level directory:
- An `assets/` folder with mp4 files.
- A `packager-linux-x64` executable (from https://github.com/shaka-project/shaka-packager/releases).
- A symlink `C2paPlayer/` to the latest version of C2paPlayer (from the C2PA fork of dash.js).
- A symlink `certs` to a directory that contains your C2PA Claim Signing certificate and private key.

To run the script:
`./sign_c2pa_dash.sh example_asset.mp4`
Then, the signed MPEG-DASH package should be written to `output/example_asset/av.mpd`.
