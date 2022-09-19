
async function accountProfile(account, lwned, verification, lensHub) {
  const lensProfileId = await lensHub.methods.defaultProfile(account).call();
  let lensProfile;
  if(lensProfileId !== '0') {
    lensProfile = await lensHub.methods.getProfile(lensProfileId).call();
  }
  const cpExpiration = await verification.methods.addressExpiration(account).call();
  let cpIdHash, cpOver18, cpOver21, cpCountry;
  if(cpExpiration !== '0') {
    cpIdHash = await verification.methods.addressIdHash(account).call();
    cpOver21 = await verification.methods.isOver21(account).call();
    if(!cpOver21) {
      cpOver18 = await verification.methods.isOver18(account).call();
    }
    cpCountry = await verification.methods.getCountryCode(account).call();
  }
  return `
    <h2>Account Profile</h2>
    <dl>
      <dt>Wallet Address</dt>
      <dd><a href="${explorer(account)}">${account}</a></dd>
      <dt>Lens Profile</dt>
      <dd class="lens-profile">${lensProfile ? `
        <img alt="${lensProfile.handle} avatar" src="https://ik.imagekit.io/lensterimg/tr:n-avatar,tr:di-placeholder.webp/https://lens.infura-ipfs.io/ipfs/${lensProfile.imageURI.slice(7)}">
        <a href="https://lenster.xyz/u/${lensProfile.handle}">${lensProfile.handle}</a>
        <span class="post-count">Post count: ${lensProfile.pubCount}</span>
      ` : 'No Lens Profile found'}</dd>
      <dt>Coinpassport Verification Status</dt>
      <dd class="coinpassport-status">
        ${cpExpiration !== '0' ? `
          <span class="expiration">Verified Passport expires: ${new Date(cpExpiration * 1000).toLocaleString()}</span><br>
          <span class="age">Age: ${cpOver21 ? 'Over 21' : cpOver18 ? 'Over 18' : 'No age data published'}</span><br>
          <span class="country">Country: ${cpCountry !== '0' ? String.fromCharCode(cpCountry >> 16) + String.fromCharCode(cpCountry - ((cpCountry >> 16) << 16)) : 'Not published'}</span><br>
          <a href="/?method=byBorrowerIdHash&q=${cpIdHash}&start=0&count=100">Loans for this passport</a>

        ` : 'No passport verification found'}
      </dd>
      <dt>Loan History</dt>
      <dd>
        <a href="/?method=byBorrower&q=${account}&start=0&count=100">Loans as borrower</a><br>
        <a href="/?method=byLender&q=${account}&start=0&count=100">Loans as lender</a>
      </dd>
    </dl>
  `;
}
