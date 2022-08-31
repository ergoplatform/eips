{
  // This box (pool box)
  //   epoch start height is stored in creation Height (R3)
  //   R4 Current data point (Long)
  //   R5 Current epoch counter (Int)
  // 
  //   tokens(0) pool token (NFT)
  //   tokens(1) reward tokens
  //   When initializing the box, there must be one reward token. When claiming reward, one token must be left unclaimed   
  
  val otherTokenId = INPUTS(1).tokens(0)._1
  val refreshNFT = fromBase64("VGpXblpyNHU3eCFBJUQqRy1LYU5kUmdVa1hwMnM1djg=") // TODO replace with actual
  val updateNFT = fromBase64("YlFlVGhXbVpxNHQ3dyF6JUMqRi1KQE5jUmZValhuMnI=") // TODO replace with actual

  sigmaProp(otherTokenId == refreshNFT || otherTokenId == updateNFT)
}
