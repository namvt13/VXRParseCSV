const fs = require("fs");
const moment = require("moment");

const path = process.argv[2] || "/home/thanos/Downloads/sharing/";

function msToWeekNumber(ms) {
	return moment(ms * 1000).isoWeek();
}
function addToPerWeeks(arr, userCode, userTime) {
	const time = msToWeekNumber(userTime);
	if (arr[userCode]) {
		arr[userCode][time] = arr[userCode][time] ? arr[userCode][time] + 1 : 1;
	} else {
		arr[userCode] = {
			[time]: 1
		};
	}
}
function addObjToPerWeeks(arr, userCode, obj) {
	const time = msToWeekNumber(obj.time);
	if (arr[userCode]) {
		if (arr[userCode][time]) {
			arr[userCode][time].push(obj);
		} else {
			arr[userCode][time] = [obj];
		}
	} else {
		arr[userCode] = {
			[time]: [obj]
		};
	}
}

const commentsAndReactsPerWeek = {};
const sharingsPerWeek = {};
const userObj = {};

const fileArr = fs.readdirSync(path);
fileArr.forEach((f) => {
	const postObjArr = [];
	const fileContentArr = JSON.parse(fs.readFileSync(path + f).toString());

	fileContentArr.forEach((e) => {
		if (e.replies) {
			e.replies.forEach((r) => {
				addToPerWeeks(commentsAndReactsPerWeek, r.user, r.ts);
			});
		}
		if (e.attachments) {
			addObjToPerWeeks(sharingsPerWeek, e.user, {
				time: e.ts,
				postId: e.client_msg_id,
				numberOfReplies: e.replies ? e.replies.length : 0
			});
		}

		const obj = {
			name: e.user_profile ? e.user_profile.name : "Unknown",
			code: e.user,
			points: 0,
			noOfSharings: e.attachments ? e.attachments.length : 0,
			noOfReactsFromOthers: e.reactions
				? e.reactions.reduce((total, curr) => {
						curr.users.forEach((u) => {
							addToPerWeeks(commentsAndReactsPerWeek, u, e.ts);
						});
						return total + curr.count;
				  }, 0)
				: 0,
			noOfCommentsFromOthers: e.replies ? e.replies.length : 0,
			repliersToThisUser: e.replies ? e.replies.map((r) => r.user) : []
		};
		obj.noOfReactsAndCommentsFromOthers =
			obj.noOfReactsFromOthers + obj.noOfCommentsFromOthers;

		postObjArr.push(obj);
	});

	postObjArr.forEach((obj) => {
		const key = obj.code;
		if (!userObj[key]) {
			userObj[key] = obj;
		} else {
			userObj[key].noOfSharings += obj.noOfSharings;
			userObj[key].noOfReactsFromOthers += obj.noOfReactsFromOthers;
			userObj[key].noOfCommentsFromOthers += obj.noOfCommentsFromOthers;
			userObj[key].noOfReactsAndCommentsFromOthers +=
				obj.noOfReactsAndCommentsFromOthers;
			userObj[key].repliersToThisUser = [
				...userObj[key].repliersToThisUser,
				...obj.repliersToThisUser
			];
		}
	});
});

Object.keys(userObj).forEach((u) => {
	const userCode = userObj[u].code;
	const userSharings = sharingsPerWeek[userCode];
ơi
	let numberOfQualifiedSharings = 0;
	if (userSharings) {
		Object.keys(userSharings).forEach((weekNumber) => {
			let total = 0;
			userSharings[weekNumber].forEach((sharing) => {
				if (sharing.numberOfReplies > 2 && total < 5) {
					numberOfQualifiedSharings++;
					total++;
				}
			});
		});
		userObj[u].points += numberOfQualifiedSharings * 2;
	}

	if (commentsAndReactsPerWeek[u])
		userObj[u].commentsAndReacts = commentsAndReactsPerWeek[u];
	Object.keys(commentsAndReactsPerWeek[u]).forEach((time) => {
		userObj[u].points +=
			commentsAndReactsPerWeek[u][time] > 10
				? 10
				: commentsAndReactsPerWeek[u][time];
	});
});

console.log("Result: ");
console.log(userObj);
