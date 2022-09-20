
async function loanComments(loan, url, browser, lensHub, verification) {
  const viewForm = `
    <form>
      <fieldset>
        <legend>Display Options</legend>
        <label><span>Start:</span>
        <input name="start" value="${htmlEscape(url.searchParams.get('start') || '0')}">
        </label>
        <label><span>Count:</span>
        <input name="count" inputmode="numeric" value="${htmlEscape(url.searchParams.get('count') || '100')}">
        </label>
        <button>Update</button>
      </fieldset>
    </form>
  `;

  const args = [loan.loan];
  const start = Number(url.searchParams.get('start') || 0);
  args.push(start);
  args.push(url.searchParams.get('count') || 100);

  const total = await browser.methods.commentCount(loan.loan).call()
  const result = await browser.methods.comments(...args).call();
  const now = await currentTimestamp();
  return `
    <h2>Comments on <a href="/loan/${loan.loan}">${userInput(loan.name)}</a></h2>
  ` + postForm(loan) + viewForm + await commentList(result, start, total, now, lensHub, verification);
}

async function commentList(data, start, total, now, lensHub, verification) {
  let commentHTML = '';
  for(let comment of data) {
    commentHTML += `
      <li class="comment">${await commentRender(comment, now, lensHub, verification)}</li>
    `;
  }
  return `
    <p class="paging">${start+1}-${start+data.length} of ${total}</p>
    <ol class="comments" start="${start+1}">
      ${commentHTML}
    </ol>
  `;
}

async function commentRender(comment, now, lensHub, verification) {
  const lensProfileId = await lensHub.methods.defaultProfile(comment.author).call();
  let lensProfile;
  if(lensProfileId !== '0') {
    lensProfile = await lensHub.methods.getProfile(lensProfileId).call();
  }
  const cpValid = await verification.methods.addressActive(comment.author).call();
  return `
    <span class="author"><a href="/account/${comment.author}" title="Author Profile">${lensProfile ? `
        <img alt="${lensProfile.handle} avatar" class="avatar" src="https://ik.imagekit.io/lensterimg/tr:n-avatar,tr:di-placeholder.webp/https://lens.infura-ipfs.io/ipfs/${lensProfile.imageURI.slice(7)}">
        ${lensProfile.handle}` : ellipseAddress(comment.author)}</a>${cpValid ? '<span class="passport-badge" title="Passport Verified">Passport Verified</span>' : ''}</span>
    <time datetime="${new Date(comment.timestamp * 1000).toJSON()}">${new Date(comment.timestamp * 1000).toLocaleString()}</time>
    <div class="comment-text">${userInput(comment.text)}</div>
  `;
}

function postForm(loan) {
  return `
    <form onsubmit="postComment(this); return false" data-loan="${loan.loan}">
      <fieldset><legend>Post Comment</legend>
      <textarea></textarea>
      <button>Submit</button>
      </fieldset>
    </form>
  `;
}
