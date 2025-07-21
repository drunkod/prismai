# /home/alex/Documents/projects/extentions/prismai/flake.nix

{
  description = "A development environment for the Prismai browser extension.";

  inputs = {
    # You are using a nixpkgs version that contains playwright v1.52.0, which is perfect.
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05"; # or the specific commit you have
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };

        # --- THIS IS THE ROBUST LOGIC, DERIVED FROM THE SOURCE ---
        # 1. Get the playwright-driver package, which is an alias for playwright-core.
        pw_driver = pkgs.playwright-driver;

        # 2. Access the passthru attributes to get the browsers directory and revision number.
        browsers = pw_driver.passthru.browsers;
        chromiumRevision = pw_driver.passthru.browsersJSON.chromium.revision;

        # 3. Construct the full, dynamic path to the executable.
        chromiumPath = "${browsers}/chromium-${chromiumRevision}/chrome-linux/chrome";
      in
      {
        devShells = {
        
        default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            corepack
            git
            # This provides the necessary browser binaries and libraries.
            pw_driver
          ];

          shellHook = ''
            export PLAYWRIGHT_BROWSERS_PATH="${browsers}"
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true

            # We must use our own custom variable to reliably force Playwright to use this path.
            export CHROMIUM_EXECUTABLE_PATH="${chromiumPath}"

            echo "✅ Nix environment for Prismai is ready."
            echo "✅ Playwright executable path is dynamically set to: $CHROMIUM_EXECUTABLE_PATH"
          '';
        };
        # The new shell for headless/cloud/CI environments
      headless = pkgs.mkShell {
            buildInputs = with pkgs; [
              nodejs_20
              corepack
              git
              pw_driver
              # Add xvfb-run and its dependencies for a virtual screen
              xorg.xhost
              xorg.xauth
              xvfb-run
            ];

            shellHook = ''
              export PLAYWRIGHT_BROWSERS_PATH="${browsers}"
              export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
              export CHROMIUM_EXECUTABLE_PATH="${chromiumPath}"
              # This new variable will tell our test fixture to run headless
              export BROWSER_HEADLESS=true
              echo "✅ Headless environment is ready."
              echo "✅ Executable path: $CHROMIUM_EXECUTABLE_PATH"
            '';
          };

      };
      }
    );
}