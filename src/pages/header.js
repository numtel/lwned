

function htmlHeader(title) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title}</title>
        <script src="/deps/web3.min.js"></script>
        <script src="/deps/coinbase.min.js"></script>
        <script src="/deps/web3modal.min.js"></script>
        <script src="/index.js" type="module"></script>
        <link rel="stylesheet" href="/normalize.css">
        <link rel="stylesheet" href="/concrete.css">
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
      <main>
        <header>
          <h1><a href="/">Lwned</a></h1>
          <p>
            <a href="/new-loan"><button>Apply for a Loan</button></a>
            <a href="https://newgeocities.com/webmaster/blog/lwned.html"><button>Docs</button></a>
            <a href="https://github.com/numtel/lwned"><button>Github</button></a>
          </p>
          <div id="wallet-status"></div>
        </header>
  `;
}
