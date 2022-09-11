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
  }
  struct Comment {
    address author;
    uint timestamp;
    string text;
  }

  function byLender(
    ILwned factory,
    address lender,
    uint startIndex,
    uint fetchCount
  ) external view returns(LoanDetails[] memory) {
    uint itemCount = factory.countOfLender(lender);
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
        loan.text()
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
        loan.text()
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
        loan.text()
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
        loan.text()
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
        loan.text()
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
