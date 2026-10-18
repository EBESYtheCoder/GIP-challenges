#include <unordered_set>
#include <vector>

using namespace std;

int firstMissingPositive(vector<int>& nums) {
    unordered_set<int> positiveNumbers(nums.begin(), nums.end());
    int answer = 1;

    while (positiveNumbers.count(answer)) {
        answer++;
    }

    return answer;
}
