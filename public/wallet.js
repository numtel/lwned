
const configPromise = (async () => await (await fetch('/config.json')).json())();


async function web3ReadOnly() {
  const config = await configPromise;
  return new Web3(config.rpc);
}

async function wallet() {
  const config = await configPromise;
  const web3Modal = new Web3Modal.default({
    cacheProvider: true,
    providerOptions: {
      coinbasewallet: {
        package: CoinbaseWalletSDK,
        options: {
          appName: 'Lwned',
          rpc: config.rpc,
          chainId: Number(config.chain),
        }
      },
    }
  });
  let provider;
  try {
    provider = await web3Modal.connect();
  } catch(e) {
    console.log("Could not get a wallet connection", e);
    return;
  }
  const web3 = new Web3(provider);
  web3.eth.handleRevert = true;
  const chainId = '0x' + (await web3.eth.getChainId()).toString(16);
  if(chainId !== config.chain) {
    let tryAddChain = false;
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [ { chainId: config.chain } ]
      });
    } catch(error) {
      if(error.message.match(
          /wallet_addEthereumChain|Chain 0x[0-9a-f]+ hasn't been added/)) {
        tryAddChain = true;
      } else {
        alert(error.message);
        return;
      }
    }

    if(tryAddChain) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [ {
            chainId: config.chain,
            chainName: config.chainName,
            nativeCurrency: config.nativeCurrency,
            rpcUrls: [ config.rpc ],
            blockExplorerUrls: [ config.blockExplorer ]
          } ]
        });
      } catch(error) {
        alert(error.message);
        return;
      }
    }
  }
  const accounts = await new Promise((resolve, reject) => {
    web3.eth.getAccounts((error, accounts) => {
      if(error) reject(error);
      else resolve(accounts);
    });
  });
  return {web3, accounts, config};
}
