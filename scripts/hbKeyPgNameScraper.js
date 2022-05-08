async function copyList(){
	let strGames = "";
	const elJumpTo = document.getElementsByClassName("js-jump-to-page jump-to-page");
	let intLastPage = elJumpTo.length-2;
	let intPageCount = 1;
	const monthlies = [];
	const monthlyInfo = []; 
	const opts = await getExtOptions( {
		fetchChoices: true,
		b4Name: '',
		aftName: '',
		b4Monthly: '',
		aftMonthly: '',
		b4Rem: '',
		aftRem: ''
	} );

	if(intLastPage > 0){ 
		if (elJumpTo[elJumpTo.length-1].innerText !== ""){ 
			intLastPage = elJumpTo.length-1;
		}
		intPageCount = Number(elJumpTo[intLastPage].innerText);
		if(elJumpTo[1].innerText === "1"){
			elJumpTo[1].click();
		}
	}
	
	for (let j = 0; j< intPageCount;j++){
		const elH4 = document.querySelectorAll("h4");
		const elChoiceUrls = document.getElementsByClassName("choice-button");
		const descriptions = document.getElementsByClassName("game-name");
		if (elChoiceUrls.length > 0 && opts.fetchChoices !== false){
			for (let i = 0; i < elChoiceUrls.length; i++){
				monthlies.push(elChoiceUrls[i].href);
			};
		};
		for (let i = 0; i < elH4.length; i++){
			if(elH4[i].innerHTML.endsWith("Humble Choice")){ 
				if (opts.fetchChoices !== false) {
					const tempInfo = descriptions[i+1].innerText.split("\n",2);
					tempInfo[1] = tempInfo[1].slice(9, -1);
					monthlyInfo.push(`${opts.b4Monthly}${tempInfo[0]}${opts.aftMonthly}\n${opts.b4Rem}${tempInfo[1]}${opts.aftRem}`);
				}
			} else {
			    strGames += `${opts.b4Name}${elH4[i].innerHTML}${opts.aftName}\n`;
			}
		};
		if (j < intPageCount -1){
			document.getElementsByClassName("hb hb-chevron-right")[0].click(); 
		};
	};
	
	if (monthlies.length > 0){
		fetchMonthlies(monthlies,strGames,monthlyInfo);
    } else {	
		readySave(strGames);
    }		
};


async function fetchMonthlies(urls,strGames,monthlyInfo) {
	
	const promises = urls.map(async url => {
		const response = await fetch(url);
		return response.text();
	});
  
	const opts = await getExtOptions( {b4Choice: '', aftChoice: ''} );

	let index = 0;
	for(const promise of promises) {
		const parser = new DOMParser();
		const doc = parser.parseFromString(await promise, 'text/html');

		const elWebpack = doc.getElementById("webpack-monthly-product-data");
		
		let monthlyData;

		if (elWebpack && elWebpack.innerText && elWebpack.innerText.includes('contentChoiceOptions') ) { // two people have mentioned an error / innerText not there 
			monthlyData = await JSON.parse(elWebpack.innerText).contentChoiceOptions;
		} else {
			console.log(urls[index]); // should display urls/bundles that are causing issues / no innerText
			index++
			continue // end this loop iteration, data not there / innerText not found
		}

		let choicePlan = "initial";
		if (monthlyData.contentChoiceData["initial-get-all-games"]) {
			choicePlan = "initial-get-all-games";
		}

		let choiceData;
		if (monthlyData.usesChoices) {
			choiceData = monthlyData.contentChoiceData[choicePlan].content_choices; // all choices for that month
		} else {
			choiceData = monthlyData.contentChoiceData.game_data; // alternative place for data, to cover "choiceLess" choice/monthly
		}
		
		if (monthlyData.hasOwnProperty("contentChoicesMade")) {
			const choicesMade = monthlyData.contentChoicesMade[choicePlan].choices_made; // array of machine names of game/s that have been redeemed
			
			for (let i = 0; i < choicesMade.length; i++){
				if(choiceData.hasOwnProperty(choicesMade[i])){
					delete choiceData[choicesMade[i]];
				}
			};
		}
		
		strGames += `\n${monthlyInfo[index]}\n`;
		const choiceKeys = Object.keys(choiceData);

		for (let i = 0; i < choiceKeys.length; i++){
			const curKey = choiceKeys[i];
			strGames += `${opts.b4Choice}${choiceData[curKey].title}${opts.aftChoice}\n`;
		};
		index++;
	}
	readySave(strGames);
};
