function firstMissingPositive(nums) {
  const positiveNumbers = new Set(nums);
  let answer = 1;

  while (positiveNumbers.has(answer)) {
    answer += 1;
  }

  return answer;
}
