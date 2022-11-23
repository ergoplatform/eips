{ // This box (update box):
  // Registers empty 
  // 
  // ballot boxes (Inputs)
  // R4 the pub key of voter [GroupElement] (not used here)
  // R5 the creation height of this box [Int]
  // R6 the value voted for [Coll[Byte]] (hash of the new pool box script)
  // R7 the reward token id in new box 
  // R8 the number of reward tokens in new box 

  val poolNFT = fromBase64("RytLYlBlU2hWbVlxM3Q2dzl6JEMmRilKQE1jUWZUalc=") // TODO replace with actual 

  val ballotTokenId = fromBase64("P0QoRy1LYVBkU2dWa1lwM3M2djl5JEImRSlIQE1iUWU=") // TODO replace with actual 

  val minVotes = 6 // TODO replace with actual
  
  val poolIn = INPUTS(0) // pool box is 1st input
  val poolOut = OUTPUTS(0) // copy of pool box is the 1st output

  val updateBoxOut = OUTPUTS(1) // copy of this box is the 2nd output

  // compute the hash of the pool output box. This should be the value voted for
  val poolOutHash = blake2b256(poolOut.propositionBytes)
  val rewardTokenId = poolOut.tokens(1)._1
  val rewardAmt = poolOut.tokens(1)._2
  
  val validPoolIn = poolIn.tokens(0)._1 == poolNFT
  
  val validPoolOut = poolIn.tokens(0) == poolOut.tokens(0)                && // NFT preserved
                     poolIn.creationInfo._1 == poolOut.creationInfo._1    && // creation height preserved
                     poolIn.value == poolOut.value                        && // value preserved 
                     poolIn.R4[Long] == poolOut.R4[Long]                  && // rate preserved  
                     poolIn.R5[Int] == poolOut.R5[Int]                    && // counter preserved
                     ! (poolOut.R6[Any].isDefined)

  
  val validUpdateOut = updateBoxOut.tokens == SELF.tokens                     &&
                       updateBoxOut.propositionBytes == SELF.propositionBytes &&
                       updateBoxOut.value >= SELF.value                       &&
                       updateBoxOut.creationInfo._1 > SELF.creationInfo._1    &&
                       ! (updateBoxOut.R4[Any].isDefined) 

  def isValidBallot(b:Box) = if (b.tokens.size > 0) {
    b.tokens(0)._1 == ballotTokenId       &&
    b.R5[Int].get == SELF.creationInfo._1 && // ensure vote corresponds to this box by checking creation height
    b.R6[Coll[Byte]].get == poolOutHash   && // check proposition voted for
    b.R7[Coll[Byte]].get == rewardTokenId && // check rewardTokenId voted for
    b.R8[Long].get == rewardAmt              // check rewardTokenAmt voted for
  } else false
  
  val ballotBoxes = INPUTS.filter(isValidBallot)
  
  val votesCount = ballotBoxes.fold(0L, {(accum: Long, b: Box) => accum + b.tokens(0)._2})
  
  sigmaProp(validPoolIn && validPoolOut && validUpdateOut && votesCount >= minVotes)  
}
