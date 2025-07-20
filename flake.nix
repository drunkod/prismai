{
  description = "A development environment for the Prismai browser extension.";

  # Flake inputs: specify dependencies on other flakes, like nixpkgs.
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  # Flake outputs: define what this flake provides (packages, shells, etc.).
  outputs = { self, nixpkgs, flake-utils }:
    # Use flake-utils to create outputs for common systems (linux, macos).
    flake-utils.lib.eachDefaultSystem (system:
      let
        # Import nixpkgs for the specific system.
        pkgs = import nixpkgs { inherit system; };
      in
      {
        # The 'devShell' is the environment you enter with 'nix develop'.
        devShells.default = pkgs.mkShell {
          # Packages needed at runtime inside the shell.
          buildInputs = with pkgs; [
            # Use a recent LTS version of Node.js.
            nodejs_20
            # Corepack is the modern way to manage pnpm and yarn.
            corepack
          ];

          # Packages needed for the tools used during development.
          # Here we provide the patched browsers that Playwright will use.
          nativeBuildInputs = with pkgs; [
            playwright-driver.browsers
          ];

          # A script that runs every time you enter the shell.
          shellHook = ''
            # Set the path for Playwright to find the Nix-managed browsers.
            export PLAYWRIGHT_BROWSERS_PATH="${pkgs.playwright-driver.browsers}"
            # Tell Playwright to skip its own validation check, as Nix handles dependencies.
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true

            # Greet the user with confirmation.
            echo "✅ Nix environment for Prismai is ready."
            echo "✅ Playwright will use browsers from: $PLAYWRIGHT_BROWSERS_PATH"
          '';
        };
      }
    );
}
