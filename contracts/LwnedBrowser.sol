// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ILwned.sol";
import "./ILoan.sol";

contract LwnedBrowser {
  struct LoanDetails {
    address loan;
    address borrower;
    bytes32 idHash;
    address token;
    uint8 status;
    uint amountToGive;
    uint amountToRepay;
    uint deadlineIssue;
    uint deadlineRepay;
    address[] collateralTokens;
    uint[] collateralAmounts;
    uint commentCount;
    string text;
    string name;
  }
  struct Comment {
    address author;
    uint timestamp;
    string text;
  }

  function single(address loanAddress) public view returns(LoanDetails memory) {
    ILoan loan = ILoan(loanAddress);
    return LoanDetails(
      address(loan),
      loan.borrower(),
      loan.idHash(),
      loan.token(),
      loan.status(),
      loan.amountToGive(),
      loan.amountToRepay(),
      loan.deadlineIssue(),
      loan.deadlineRepay(),
      loan.allCollateralTokens(),
      loan.allCollateralAmounts(),
      loan.commentCount(),
      loan.text(),
      loan.name()
    );
  }

  function many(address[] memory loanAddress) external view returns(LoanDetails[] memory) {
    LoanDetails[] memory out = new LoanDetails[](loanAddress.length);
    for(uint i; i < loanAddress.length; i++) {
      out[i] = single(loanAddress[i]);
    }
    return out;
  }

  function byLender(
    ILwned factory,
    address lender,
    uint startIndex,
    uint fetchCount
  ) external view returns(LoanDetails[] memory) {
    uint itemCount = factory.countOfLender(lender);
    if(itemCount == 0) {
      return new LoanDetails[](0);
    }
    require(startIndex < itemCount);
    if(startIndex + fetchCount >= itemCount) {
      fetchCount = itemCount - startIndex;
    }
    LoanDetails[] memory out = new LoanDetails[](fetchCount);
    for(uint i; i < fetchCount; i++) {
      ILoan loan = ILoan(factory.loansByLender(lender, startIndex + i));
      out[i] = LoanDetails(
        address(loan),
        loan.borrower(),
        loan.idHash(),
        loan.token(),
        loan.status(),
        loan.amountToGive(),
        loan.amountToRepay(),
        loan.deadlineIssue(),
        loan.deadlineRepay(),
        loan.allCollateralTokens(),
        loan.allCollateralAmounts(),
        loan.commentCount(),
        loan.text(),
        loan.name()
      );
    }
    return out;
  }

  function byBorrower(
    ILwned factory,
    address borrower,
    uint startIndex,
    uint fetchCount
  ) external view returns(LoanDetails[] memory) {
    uint itemCount = factory.countOf(borrower);
    if(itemCount == 0) {
      return new LoanDetails[](0);
    }
    require(startIndex < itemCount);
    if(startIndex + fetchCount >= itemCount) {
      fetchCount = itemCount - startIndex;
    }
    LoanDetails[] memory out = new LoanDetails[](fetchCount);
    for(uint i; i < fetchCount; i++) {
      ILoan loan = ILoan(factory.loansByBorrower(borrower, startIndex + i));
      out[i] = LoanDetails(
        address(loan),
        borrower,
        loan.idHash(),
        loan.token(),
        loan.status(),
        loan.amountToGive(),
        loan.amountToRepay(),
        loan.deadlineIssue(),
        loan.deadlineRepay(),
        loan.allCollateralTokens(),
        loan.allCollateralAmounts(),
        loan.commentCount(),
        loan.text(),
        loan.name()
      );
    }
    return out;
  }

  function byBorrowerIdHash(
    ILwned factory,
    bytes32 idHash,
    uint startIndex,
    uint fetchCount
  ) external view returns(LoanDetails[] memory) {
    uint itemCount = factory.countOfIdHash(idHash);
    if(itemCount == 0) {
      return new LoanDetails[](0);
    }
    require(startIndex < itemCount);
    if(startIndex + fetchCount >= itemCount) {
      fetchCount = itemCount - startIndex;
    }
    LoanDetails[] memory out = new LoanDetails[](fetchCount);
    for(uint i; i < fetchCount; i++) {
      ILoan loan = ILoan(factory.loansByBorrowerIdHash(idHash, startIndex + i));
      out[i] = LoanDetails(
        address(loan),
        loan.borrower(),
        loan.idHash(),
        loan.token(),
        loan.status(),
        loan.amountToGive(),
        loan.amountToRepay(),
        loan.deadlineIssue(),
        loan.deadlineRepay(),
        loan.allCollateralTokens(),
        loan.allCollateralAmounts(),
        loan.commentCount(),
        loan.text(),
        loan.name()
      );
    }
    return out;
  }

  function pending(
    ILwned factory,
    uint startIndex,
    uint fetchCount
  ) external view returns(LoanDetails[] memory) {
    uint itemCount = factory.pendingCount();
    if(itemCount == 0) {
      return new LoanDetails[](0);
    }
    require(startIndex < itemCount);
    if(startIndex + fetchCount >= itemCount) {
      fetchCount = itemCount - startIndex;
    }
    LoanDetails[] memory out = new LoanDetails[](fetchCount);
    for(uint i; i < fetchCount; i++) {
      ILoan loan = ILoan(factory.pendingAt(startIndex + i));
      out[i] = LoanDetails(
        address(loan),
        loan.borrower(),
        loan.idHash(),
        loan.token(),
        loan.status(),
        loan.amountToGive(),
        loan.amountToRepay(),
        loan.deadlineIssue(),
        loan.deadlineRepay(),
        loan.allCollateralTokens(),
        loan.allCollateralAmounts(),
        loan.commentCount(),
        loan.text(),
        loan.name()
      );
    }
    return out;
  }

  function active(
    ILwned factory,
    uint startIndex,
    uint fetchCount
  ) external view returns(LoanDetails[] memory) {
    uint itemCount = factory.activeCount();
    if(itemCount == 0) {
      return new LoanDetails[](0);
    }
    require(startIndex < itemCount);
    if(startIndex + fetchCount >= itemCount) {
      fetchCount = itemCount - startIndex;
    }
    LoanDetails[] memory out = new LoanDetails[](fetchCount);
    for(uint i; i < fetchCount; i++) {
      ILoan loan = ILoan(factory.activeAt(startIndex + i));
      out[i] = LoanDetails(
        address(loan),
        loan.borrower(),
        loan.idHash(),
        loan.token(),
        loan.status(),
        loan.amountToGive(),
        loan.amountToRepay(),
        loan.deadlineIssue(),
        loan.deadlineRepay(),
        loan.allCollateralTokens(),
        loan.allCollateralAmounts(),
        loan.commentCount(),
        loan.text(),
        loan.name()
      );
    }
    return out;
  }

  function comments(
    ILoan loan,
    uint startIndex,
    uint fetchCount
  ) external view returns(Comment[] memory) {
    uint itemCount = loan.commentCount();
    if(itemCount == 0) {
      return new Comment[](0);
    }
    require(startIndex < itemCount);
    if(startIndex + fetchCount >= itemCount) {
      fetchCount = itemCount - startIndex;
    }
    Comment[] memory out = new Comment[](fetchCount);
    for(uint i; i < fetchCount; i++) {
      ILoan.Comment memory raw = loan.comments(i);
      out[i] = Comment(raw.author, raw.timestamp, raw.text);
    }
    return out;
  }
}
