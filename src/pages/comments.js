
async function loanComments(loan, url, browser) {
  const viewForm = `
    <form>
      <fieldset>
        <legend>Display Options</legend>
        <label><span>Start:</span>
        <input name="start" value="${htmlEscape(url.searchParams.get('start') || '0')}">
        </label>
        <label><span>Count:</span>
        <input name="count" value="${htmlEscape(url.searchParams.get('count') || '100')}">
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
  return postForm(loan) + viewForm + commentList(result, start, total, now);
}

function commentList(data, start, total, now) {
  return `
    <p class="paging">${start+1}-${start+data.length} of ${total}</p>
    <ol class="comments" start="${start+1}">
      ${data.map((comment, index) => `
        <li class="comment">${commentRender(comment, now)}</li>
      `).join('')}
    </ol>
  `;
}

function commentRender(comment, now) {
  return `
    <span class="author">Author: <a href="/account/${comment.author}" title="Author Profile">${ellipseAddress(comment.author)}</a></span>
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
