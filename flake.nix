{
  description = "Stockbot - Node.js/TypeScript development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          name = "stockbot";

          buildInputs = with pkgs; [
            # Node.js runtime
            nodejs_22

            # Package managers
            nodePackages.pnpm

            # TypeScript
            nodePackages.typescript

            # Development utilities
            nodePackages.prettier
            nodePackages.eslint

            # Useful tools
            jq
            curl
          ];

          shellHook = ''
            echo ""
            echo "📦 Node.js $(node --version) + TypeScript development environment"
            echo ""
            echo "Commands:"
            echo "  pnpm install         - Install dependencies"
            echo "  pnpm dev             - Start development server"
            echo "  pnpm build           - Build for production"
            echo "  tsc --version        - Check TypeScript version"
            echo ""
          '';
        };
      }
    );
}

