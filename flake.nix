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
        browsers = pkgs.playwright-driver.browsers;
        chromiumPath = "${browsers}/chromium-1169/chrome-linux/chrome";
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            corepack
            git
            playwright-driver.browsers
          ];

          shellHook = ''
            export PLAYWRIGHT_BROWSERS_PATH="${browsers}"
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
            export CHROMIUM_EXECUTABLE_PATH="${chromiumPath}"
            echo "✅ Nix environment for Prismai is ready."
            echo "✅ Playwright will use browsers from: $PLAYWRIGHT_BROWSERS_PATH"
            echo "✅ Playwright will use CHROMIUM_EXECUTABLE_PATH: $CHROMIUM_EXECUTABLE_PATH"
          '';
        };
      }
    );
}