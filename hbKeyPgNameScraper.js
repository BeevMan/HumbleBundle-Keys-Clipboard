async function copyList(){
	let strGames = "";
	const elJumpTo = document.getElementsByClassName("js-jump-to-page jump-to-page");
	let intLastPage = elJumpTo.length-2;
	let intPageCount = 1;
	let monthlies = [];
	let monthlyInfo = []; 
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
		let elH4 = document.querySelectorAll("h4");
		let elChoiceUrls = document.getElementsByClassName("choice-button");
		let descriptions = document.getElementsByClassName("game-name");
		if (elChoiceUrls.length > 0 && opts.fetchChoices !== false){
			for (let i = 0; i < elChoiceUrls.length; i++){
				monthlies.push(elChoiceUrls[i].href);
			};
		};
		for (let i = 0; i < elH4.length; i++){
			if(elH4[i].innerHTML.endsWith("Humble Choice")){ 
				if (opts.fetchChoices !== false) {
					let tempInfo = descriptions[i+1].innerText.split("\n",2);
					tempInfo[1] = tempInfo[1].slice(9);
					tempInfo = tempInfo[0] + "\n" + tempInfo[1];
					monthlyInfo.push(tempInfo);
				}
			} else {
			    strGames += elH4[i].innerHTML + "\n";
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

  const textPromises = urls.map(async url => {
		const response = await fetch(url);
		return response.text();
	});
  
  
	let loopInt = 0;
	for (const textPromise of textPromises) {
		const parser = new DOMParser();
		const doc = parser.parseFromString(await textPromise, 'text/html');
		
		
		const monthlyData = JSON.parse(doc.getElementById("webpack-monthly-product-data").innerText).contentChoiceOptions;
		let choicePlan = Object.keys(monthlyData.contentChoiceData)[0];
		if (choicePlan.startsWith('initial') === false) {
			const ccdKeys = Object.keys(monthlyData.contentChoiceData);
			for (let i = 1; i < ccdKeys.length; i++ ){ 
				if (ccdKeys[i].startsWith('initial')){
					choicePlan = ccdKeys[i];
					break
				}
			};
		}
		let choiceData = monthlyData.contentChoiceData[choicePlan].content_choices;
		
		if (monthlyData.hasOwnProperty("contentChoicesMade")) {
			let choicesMade = monthlyData.contentChoicesMade[choicePlan].choices_made;
			
			for (let i = 0; i < choicesMade.length; i++){
				if(choiceData.hasOwnProperty(choicesMade[i])){
					delete choiceData[choicesMade[i]];
				}
			};
		}
		
		strGames += monthlyInfo[loopInt] + "\n";
		let choiceKeys = Object.keys(choiceData);

		for (let i = 0; i < choiceKeys.length; i++){
			let curKey = choiceKeys[i];
			strGames += choiceData[curKey].title + "\n";
		};
		
		loopInt++;
	}
	readySave(strGames);
};


function clipboard(toCopy){
	if (navigator.clipboard){
		navigator.clipboard.writeText(toCopy).then(function() {
			alert("Game list copied to clipboard!");
		}, function() {
			alert("Could not copy list to clipboard.");
		});
	} else {
		let dummy = document.createElement("textarea");
		document.body.appendChild(dummy);
		dummy.value = toCopy;
		dummy.select();
		document.execCommand("copy");
		document.body.removeChild(dummy); 
		alert("List SHOULD be copied to clipboard.  Older browsers may experience issues copying large lists to clipboard.  Please update your browser for better support. firefox 63, chrome 76, safari 13.1 or higher");
	};
};


async function readySave(toSave) {
	const opts = await getExtOptions( {saving: 'txt', fileName: 'hbKeysToClipboard'} );
	
	if(opts.saving === "txt"){
		let blob = new Blob([toSave], {type: "text/plain;charset=utf-8"});
		saveAs(blob, opts.fileName + ".txt");
	} else {
		clipboard(toSave)
	};
};


async function addButton(){
	const options = await getExtOptions( {iconButton: true} );
	const buttOpt = options.iconButton ?? true;
	let icon;
	
	if (buttOpt !== false) {
		if (chrome.runtime){
			icon = chrome.runtime.getURL('32-clipboard.png');
		} else {
			icon = "moz-extension://<extension-UUID>/32-clipboard.png";
		};
	}
	let btn = document.createElement("label");
	if (icon === undefined) {
		btn.innerHTML = '<button type="button">List to clipboard.</button>'
	} else {
		btn.innerHTML = '<input type="image" src=" '+ icon +' " alt="List to clipboard." >' ;
	}
	btn.addEventListener("click", copyList);
	document.getElementsByClassName("sort")[0].appendChild(btn);
};


function getExtOptions(key) { 
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.sync.get(key, function (value) {
                resolve(value);
            })
        }
        catch (ex) {
            reject(key);
        }
    });
};


addButton();