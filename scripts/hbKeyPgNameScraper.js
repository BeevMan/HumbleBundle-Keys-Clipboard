async function copyList(){
	let strGames = "";
	const elJumpTo = document.getElementsByClassName("js-jump-to-page jump-to-page");
	let intLastPage = elJumpTo.length-2;
	let intPageCount = 1;
	const monthlies = [];
	const monthlyInfo = []; 
	const opts = await getExtOptions( {fetchChoices: true} );
	

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
					tempInfo[1] = tempInfo[1].slice(9);
					monthlyInfo.push(`${tempInfo[0]}  \n${tempInfo[1]}`);
				}
			} else {
			    strGames += `${elH4[i].innerHTML}  \n`;
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
  
	let index = 0;
	for(const promise of promises) {
		const parser = new DOMParser();
		const doc = parser.parseFromString(await promise, 'text/html');
		
		
		const monthlyData = await JSON.parse(doc.getElementById("webpack-monthly-product-data").innerText).contentChoiceOptions;
		let choicePlan = "initial";
		if (monthlyData.contentChoiceData["initial-get-all-games"]) {
			choicePlan = "initial-get-all-games";
		}

		const choiceData = monthlyData.contentChoiceData[choicePlan].content_choices; // all choices for that month
		
		if (monthlyData.hasOwnProperty("contentChoicesMade")) {
			const choicesMade = monthlyData.contentChoicesMade[choicePlan].choices_made;
			
			for (let i = 0; i < choicesMade.length; i++){
				if(choiceData.hasOwnProperty(choicesMade[i])){
					delete choiceData[choicesMade[i]];
				}
			};
		}
		
		strGames += `  \n${monthlyInfo[index]}  \n`;
		const choiceKeys = Object.keys(choiceData);

		for (let i = 0; i < choiceKeys.length; i++){
			const curKey = choiceKeys[i];
			strGames += `${choiceData[curKey].title}  \n`;
		};
		index++;
	}
	readySave(strGames);
};
