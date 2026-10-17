def find_different_binary_string(nums):
    answer = ""

    for index in range(len(nums)):
        answer += "1" if nums[index][index] == "0" else "0"

    return answer
