{ // This box (oracle box)
  //   R4 public key (GroupElement) 
  //   R5 epoch counter of current epoch (Int)
  //   R6 data point (Long) or empty

  //   tokens(0) oracle token (one)
  //   tokens(1) reward tokens collected (one or more) 
  //   
  //   When publishing a datapoint, there must be at least one reward token at index 1 
  //  
  //   We will connect this box to pool NFT in input #0 (and not the refresh NFT in input #1)
  //   This way, we can continue to use the same box after updating pool
  //   This *could* allow the oracle box to be spent during an update
  //   However, this is not an issue because the update contract ensures that tokens and registers (except script) of the pool box are preserved

  //   Private key holder can do following things:
  //     1. Change group element (public key) stored in R4
  //     2. Store any value of type in or delete any value from R4 to R9 
  //     3. Store any token or none at 2nd index 

  //   In order to connect this oracle box to a different refreshNFT after an update, 
  //   the oracle should keep at least one new reward token at index 1 when publishing data-point
  
  val poolNFT = fromBase64("RytLYlBlU2hWbVlxM3Q2dzl6JEMmRilKQE1jUWZUalc=") // TODO replace with actual 
  
  val otherTokenId = INPUTS(0).tokens(0)._1
  
  val minStorageRent = 10000000L
  val selfPubKey = SELF.R4[GroupElement].get
  val outIndex = getVar[Int](0).get
  val output = OUTPUTS(outIndex)
  
  val isSimpleCopy = output.tokens(0) == SELF.tokens(0)                && // oracle token is preserved
                     output.propositionBytes == SELF.propositionBytes  && // script preserved
                     output.R4[GroupElement].isDefined                 && // output must have a public key (not necessarily the same)
                     output.value >= minStorageRent                       // ensure sufficient Ergs to ensure no garbage collection
                     
  val collection = otherTokenId == poolNFT                    && // first input must be pool box
                   output.tokens(1)._1 == SELF.tokens(1)._1   && // reward tokenId is preserved (oracle should ensure this contains a reward token)
                   output.tokens(1)._2 > SELF.tokens(1)._2    && // at least one reward token must be added 
                   output.R4[GroupElement].get == selfPubKey  && // for collection preserve public key
                   output.value >= SELF.value                 && // nanoErgs value preserved
                   ! (output.R5[Any].isDefined)                  // no more registers; prevents box from being reused as a valid data-point

  val owner = proveDlog(selfPubKey)  

  // owner can choose to transfer to another public key by setting different value in R4
  isSimpleCopy && (owner || collection) 
}
