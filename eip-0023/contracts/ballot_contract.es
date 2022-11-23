{ // This box (ballot box):
  // R4 the group element of the owner of the ballot token [GroupElement]
  // R5 the creation height of the update box [Int]
  // R6 the value voted for [Coll[Byte]]
  // R7 the reward token id [Coll[Byte]]
  // R8 the reward token amount [Long]

  val updateNFT = fromBase64("YlFlVGhXbVpxNHQ3dyF6JUMqRi1KQE5jUmZValhuMnI=") // TODO replace with actual 

  val minStorageRent = 10000000L  // TODO replace with actual
  
  val selfPubKey = SELF.R4[GroupElement].get
  
  val outIndex = getVar[Int](0).get
  val output = OUTPUTS(outIndex)
  
  val isSimpleCopy = output.R4[GroupElement].isDefined                && // ballot boxes are transferable by setting different value here 
                     output.propositionBytes == SELF.propositionBytes &&
                     output.tokens == SELF.tokens                     && 
                     output.value >= minStorageRent 
  
  val update = INPUTS.size > 1                           &&
               INPUTS(1).tokens.size > 0                 &&
               INPUTS(1).tokens(0)._1 == updateNFT       && // can only update when update box is the 2nd input
               output.R4[GroupElement].get == selfPubKey && // public key is preserved
               output.value >= SELF.value                && // value preserved or increased
               ! (output.R5[Any].isDefined)                 // no more registers; prevents box from being reused as a valid vote 
  
  val owner = proveDlog(selfPubKey)
  
  // unlike in collection, here we don't require spender to be one of the ballot token holders
  isSimpleCopy && (owner || update)
}
