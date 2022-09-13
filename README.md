![Lwned Logo](public/logo.png)
# Lwned

"Need cash? Get Lwned!"

Lending marketplace

## Installation

```
$ git clone https://github.com/numtel/lwned.git
$ cd lwned
$ npm install
```

Download the `solc` compiler. This is used instead of `solc-js` because it is much faster. Binaries for other systems can be found in the [Ethereum foundation repository](https://github.com/ethereum/solc-bin/).
```
$ curl -o solc https://binaries.soliditylang.org/linux-amd64/solc-linux-amd64-v0.8.13+commit.abaa5c0e
$ chmod +x solc
```

## Running development frontend

```sh
# To build test/contracts/*.sol (test token)
$ npm run build-test
# To transpile and build contracts/*.sol (everything else)
$ npm run build-dev

# Start http server for public directory
$ npm run dev

# Start ganache local chain on port 8545
# Accounts will be generated from seed in dev-seed.json
# And http server on port 3000
$ npm run dev-chain

# Input commands into the REPL
> help
help
# List accounts and their indexes
accounts
# Deploy a test token
deployToken
# Make new tokens
mintToken [tokenAddress] [accountAddress] [amount]
# Convenience method for testing:
#  deploy a token,
#  mint to borrower,
#  approve spend,
#  and submit loan application
fastApply [address]
# Set a user as passport verified, expiration default: 1 year
verify [address] [expiration]
# Fetch the expiration value
expiration [address]
# Increase block.timestamp by 24hrs
nextday

NOTE: can use account index in verify/mintToken/expiration calls
```

## Testing Contracts

```
# Build contracts before running tests
$ npm run build-test
$ npm run build-dev

$ npm test
```

## License

MIT
