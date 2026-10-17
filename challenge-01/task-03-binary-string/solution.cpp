#include <string>
#include <vector>

using namespace std;

string findDifferentBinaryString(vector<string>& nums) {
    string answer = "";
    int n = nums.size();

    for (int index = 0; index < n; index++) {
        answer += nums[index][index] == '0' ? '1' : '0';
    }

    return answer;
}
