// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ERC20.sol";
import "./ERC721.sol";


contract CrowdFunding {

    address public Owner;
    uint public constant FUNDING_GOAL = 50 ether;
    uint public constant NFT_THRESHOLD = 5 ether;
    uint256 public totalFundsRaised;
    bool public isFundingComplete;
    address constant NFT_CONTRACT_ADDRESS = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;
    address constant TOKEN_CONTRACT_ADDRESS = 0x5FbDB2315678afecb367f032d93F642f64180aa3;

    
    CrowdToken public rewardToken;
    CrowdNFT public rewardNFT;
    uint256 public tokenRewardRate; 
    
    // Contribution tracking
    mapping(address => uint256) public contributions;
    mapping(address => bool) public hasReceivedNFT;
    
    // Events
    event ContributionReceived(address indexed contributor, uint256 amount);
    event TokenRewardSent(address indexed contributor, uint256 amount);
    event NFTRewardSent(address indexed contributor, uint256 tokenId);
    event FundsWithdrawn(address indexed projectOwner, uint256 amount);
    
    constructor(       
        uint256 _tokenRewardRate    )
         {
     

        Owner = msg.sender;
        rewardToken = CrowdToken(TOKEN_CONTRACT_ADDRESS);
        rewardNFT = CrowdNFT(NFT_CONTRACT_ADDRESS);
        tokenRewardRate = _tokenRewardRate;

        
    }
    


    function contribute() external payable {
        require(msg.value > 0, "Contribution must be greater than 0");
        require(!isFundingComplete, "Funding goal already reached");
        
        // Update contribution record
        contributions[msg.sender] += msg.value;
        totalFundsRaised += msg.value;
        
        // Check if funding goal is reached
        if (totalFundsRaised >= FUNDING_GOAL) {
            isFundingComplete = true;
        }
        
        // Calculate token reward
        uint256 tokenReward = (msg.value * tokenRewardRate) / 1 ether;
        if (tokenReward > 0) {
            rewardToken.mintReward(msg.sender, tokenReward);
            emit TokenRewardSent(msg.sender, tokenReward);
        }
        
        // Check for NFT eligibility
        if (contributions[msg.sender] >= NFT_THRESHOLD && !hasReceivedNFT[msg.sender]) {
            uint256 tokenId = rewardNFT.mintNFT(msg.sender);
            hasReceivedNFT[msg.sender] = true;
            emit NFTRewardSent(msg.sender, tokenId);
        }
        
        emit ContributionReceived(msg.sender, msg.value);
    }
    

    function withdrawFunds() external {
        require(msg.sender == Owner, "Only project owner can withdraw");
        require(isFundingComplete, "Funding goal not yet reached");
        
        uint256 amount = address(this).balance;
        payable(Owner).transfer(amount);
        
        emit FundsWithdrawn(Owner, amount);
    }
    

    function getContribution(address contributor) external view returns (uint256) {
        return contributions[contributor];
    }
}