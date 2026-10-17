function findDifferentBinaryString(nums) {
  let answer = '';

  for (let index = 0; index < nums.length; index += 1) {
    answer += nums[index][index] === '0' ? '1' : '0';
  }

  return answer;
}
