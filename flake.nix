# /home/alex/Documents/projects/extentions/prismai/flake.nix

{
  description = "A development environment for the Prismai browser extension.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        pw_driver = pkgs.playwright-driver;
        browsers = pw_driver.passthru.browsers;
        chromiumRevision = pw_driver.passthru.browsersJSON.chromium.revision;
        chromiumPath = "${browsers}/chromium-${chromiumRevision}/chrome-linux/chrome";
      in
      {
        devShells = {
          default = pkgs.mkShell {
            buildInputs = with pkgs; [
              nodejs_20
              corepack
              git
              pw_driver
              unzip  # Add unzip for extracting the extension
            ];

            shellHook = ''
              export PLAYWRIGHT_BROWSERS_PATH="${browsers}"
              export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
              export CHROMIUM_EXECUTABLE_PATH="${chromiumPath}"

              echo "✅ Nix environment for Prismai is ready."
              echo "✅ Playwright executable path is dynamically set to: $CHROMIUM_EXECUTABLE_PATH"
            '';
          };
          
          headless = pkgs.mkShell {
            buildInputs = with pkgs; [
              nodejs_20
              corepack
              git
              pw_driver
              xorg.xhost
              xorg.xauth
              xvfb-run
              unzip  # Add unzip here too
            ];

            shellHook = ''
              export PLAYWRIGHT_BROWSERS_PATH="${browsers}"
              export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
              export CHROMIUM_EXECUTABLE_PATH="${chromiumPath}"
              export BROWSER_HEADLESS=true
              echo "✅ Headless environment is ready."
              echo "✅ Executable path: $CHROMIUM_EXECUTABLE_PATH"
            '';
          };
        };
      }
    );
}