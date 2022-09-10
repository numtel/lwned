// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./Strings.sol";
import "./utils.sol";
import "./ILensHub.sol";
import "./IVerification.sol";

contract UserBadge {
  IVerification public verification;
  ILensHub public lensHub;

  constructor(IVerification _verification, ILensHub _lensHub) {
    verification = _verification;
    lensHub = _lensHub;
  }

  function render(address account) external view returns(bytes memory) {
    bytes memory out = `<div class="user">`;

    uint profileId = lensHub.defaultProfile(account);

    if(profileId > 0) {
      ILensHub.ProfileStruct memory profile = lensHub.getProfile(profileId);
      out = `${out}
        <span data-avatar="${utils.userInputFilter(profile.imageURI)}"></span>
        <a href="https://lenster.xyz/u/${utils.userInputFilter(profile.handle)}" class="handle">${utils.userInputFilter(profile.handle)}</a>
        <span class="pubCount">${Strings.toString(profile.pubCount)}</span>
      `;
    }
    out = `${out}
      <span data-address="${Strings.toHexString(account)}"></span>
    `;
    if(verification.addressActive(account)) {
      out = `${out}
        <span class="verified">Verified Passport</span>
      `;
    }
    if(verification.isOver21(account)) {
      out = `${out}
        <span class="over21">Over 21</span>
      `;
    } else if(verification.isOver18(account)) {
      out = `${out}
        <span class="over18">Over 18</span>
      `;
    }
    uint country = verification.getCountryCode(account);
    if(country > 0) {
      out = `${out}
        <span data-country-code="${Strings.toString(country)}"></span>
      `;
    }
    return `${out}</div>`;
  }
  function renderScript() external pure returns (bytes memory) {
    // TODO implement script for other user badge fields
    return `
      document.querySelectorAll('[data-country-code]').forEach(span => {
        countryCodeInt = Number(span.getAttribute('data-country-code'));
        span.innerHTML = String.fromCharCode(countryCodeInt >> 16)
             + String.fromCharCode(countryCodeInt - ((countryCodeInt >> 16) << 16));
      });
    `;
  }
}
