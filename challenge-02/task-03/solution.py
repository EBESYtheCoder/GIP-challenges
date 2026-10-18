def first_missing_positive(nums):
    positive_numbers = set(nums)
    answer = 1

    while answer in positive_numbers:
        answer += 1

    return answer
