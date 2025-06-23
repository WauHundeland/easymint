# EasyMint

**EasyMint** is a web application for creating and managing SPL (Solana Program Library) tokens on the Solana blockchain. 

## Features

### Token Creation
- **Standard Token Creator**: Create SPL tokens with full metadata, custom images, and authority settings
- **Ultra Cheap Creator**: Create tokens with minimal cost by removing non-essential operations
- Support for custom token names, symbols, descriptions, and images
- Configurable decimals, supply, and authority settings
- Real-time fee estimation with SOL/USD conversion

### Token Management
- **Mint Tokens**: Add more tokens to circulation for tokens where you control mint authority
- **Freeze/Unfreeze**: Control token transferability by freezing specific accounts
- **Revoke Authorities**: Permanently revoke mint and freeze authorities for immutable tokens
- **Burn Tokens**: Permanently destroy tokens to reduce total supply

### User Experience
- Modern, responsive UI built with Tailwind CSS and shadcn/ui
- Dark/light theme support
- Wallet integration with popular Solana wallets (Phantom, Solflare, MetaMask, etc.)
- Real-time transaction fee estimation
- Network selection (Mainnet/Devnet)
- Comprehensive error handling and user feedback

## Technology Stack

- **Frontend**: Next.js 15 with React 19
- **Styling**: Tailwind CSS with shadcn/ui components
- **Blockchain**: Solana Web3.js and SPL Token libraries, Helius for RPC
- **Wallet Integration**: Solana Wallet Adapter
- **Deployment**: Cloudflare Workers with OpenNext
- **Storage**: Cloudflare R2 for image and metadata hosting
- **Development**: TypeScript, ESLint, PostCSS

## Prerequisites

- Node.js 20+ 
- pnpm (npm also works, but is not recommended)
- A Solana wallet (Phantom, Solflare, etc.)
- Helius API key (for RPC on mainnet)
- Cloudflare account (for deployment)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/wauhundeland/easymint.git
   cd easymint
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Setup**
   
   The application uses Cloudflare Workers environment variables. Configure the following in your `wrangler.jsonc`:
   
   ```jsonc
   {
     "vars": {
       "NEXT_PUBLIC_HELIUS_API_KEY": "your-helius-api-key"
     },
     "r2_buckets": [
       {
         "binding": "R2_BUCKET",
         "bucket_name": "your-bucket-name"
       }
     ]
   }
   ```

   You also need to configure the .env file with the following variables:
   ```
   CLOUDFLARE_R2_ENDPOINT=your-r2-endpoint-url
   CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key-id
   CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-access-key
   CLOUDFLARE_R2_BUCKET_NAME=your-bucket-name
   CLOUDFLARE_R2_PUBLIC_URL=your-r2-public-url
   NEXT_PUBLIC_HELIUS_API_KEY=your-helius-api-key
   ```

4. **Development Server**
   ```bash
   pnpm dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) to view the application.

## Deployment

The application is configured for deployment on Cloudflare Workers using OpenNext.

### Prerequisites
- Cloudflare account with Workers and R2 enabled
- Wrangler CLI configured with your Cloudflare credentials

### Deploy Commands
```bash
# Build and deploy to production
pnpm run deploy

# Preview deployment
pnpm run preview

# Generate TypeScript types for Cloudflare environment
pnpm run cf-typegen
```

### Cloudflare R2 Setup
1. Create an R2 bucket for image storage
2. Configure bucket CORS settings for web access
3. Set up a custom domain or use the R2 public URL
4. Update environment variables in `wrangler.jsonc`

## Usage

### Creating a Token

1. **Connect Your Wallet**: Click the wallet button in the navigation to connect your Solana wallet
2. **Choose Creation Type**: Select between fungible token creation or NFT mode
3. **Fill Token Details**:
   - Token name and symbol
   - Description
   - Upload token image (optional)
   - Set decimals and initial supply (for fungible tokens)
4. **Configure Authorities**: Choose whether to revoke mint/freeze authorities
5. **Review & Create**: Check the estimated fees and confirm the transaction

### Managing Existing Tokens

Navigate to the **Tools** page to access:
- **Mint**: Add more tokens to circulation
- **Freeze**: Control token account transferability  
- **Revoke**: Permanently remove authorities
- **Burn**: Destroy tokens to reduce supply

## Development

### Available Scripts

```bash
# Development with Turbopack
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm run start

# Linting
pnpm run lint

# Cloudflare deployment
pnpm run deploy
pnpm run preview
```

### Project Structure

```
src/
├── app/                   # Next.js app router pages
│   ├── mint/              # Token minting page
│   ├── burn/              # Token burning page
│   ├── freeze/            # Token freezing page
│   ├── revoke/            # Authority revocation page
│   ├── tools/             # Tools overview page
│   ├── ultra-cheap/       # Ultra cheap token creator
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── coin-creator/      # Token creation components
│   └── ...                # Feature-specific components
├── lib/                   # Utility functions
└── hooks/                 # Custom React hooks
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## Disclaimer

This tool interacts with the Solana blockchain and involves cryptocurrency transactions. The code has been tested and is working as expected. However,
I am not responsible for any unexpected financial losses or issues that may arise from using this tool.

**Use at your own risk.**<br>
**THIS TOOL IS PROVIDED "AS IS" AND WITHOUT ANY WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT, TO THE EXTENT PERMITTED BY LAW. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.**

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Solana Labs](https://solana.com/) for the blockchain infrastructure
- [Metaplex](https://www.metaplex.com/) for NFT and token standards
- [Helius](https://www.helius.dev/) for the RPC endpoint
- [shadcn/ui](https://ui.shadcn.com/) for the component library
- [Cloudflare](https://www.cloudflare.com/) for hosting and edge computing

## Support

If you encounter any issues or have questions:
- Open an issue on GitHub
- Check the [Solana documentation](https://docs.solana.com/)
- Review the [SPL Token documentation](https://spl.solana.com/token)

---

**Happy minting!**
