async function apiCall() {
	const opts = await getExtOptions( apiOptions );
	if (!compatibleOptsCheck(opts)) { // at some point I should consider moving optCheck to options.js
		return;
	}

	const userOrders = await fetch("https://www.humblebundle.com/api/v1/user/order");
	const orderKeys = await userOrders.json(); 
	const orderPromises = orderKeys.map(order => fetch(`https://www.humblebundle.com/api/v1/order/${order.gamekey}?all_tpkds=true`));
		
	const responses = await Promise.all( orderPromises); 
	const data = await Promise.all(responses.map((response) => {return response.json()}));

	if(opts.allApiData){
		// WILL NEED TO ADD A FUNCTION, IT WILL CONVERT FROM JSON TO AN APPLICABLE FORMAT IF SAVING !== ".json" || "clipboard"
		readySave(JSON.stringify(data, null, 2));
	} else {
		filterApiData(data, opts);
	}
};


const apiOptions = {
	saving: '.txt',
	allApiData: false,
	storefront: true,
	bundle: true,
	subscriptioncontent: true,
	platform: 'windows',
	direct: false,
	torrent: false,
	unRedeemed: true,
	redeemed: false,
	appID: false,
	restrictions: false,
	deliveryMethods: false,
	genres: false,
	addlChoice: false,
	sort: 'noSort',
};


function compatibleOptsCheck (options){
	if (options.allApiData){
		return true;
	} else {
		if (!options.storefront && !options.bundle && !options.subscriptioncontent) {
			return alert("Please choose a purchase type in HumbleBundle Keys Clipboard's options.");
		} else if (options.direct || options.torrent || options.unRedeemed || options.redeemed) {
			return true; // options should be compatible
		} else {
			return alert("Please choose a title redemption status and or download type in HumbleBundle Keys Clipboard's options.");
		}
	}
}


async function filterApiData(toFilter, options){
	const filtered = [];
	for(let i=0; i<toFilter.length; i++){
		const filterMe = toFilter[i];
		if( options[filterMe.product.category] ) { 
			let bundle = {}; 
			if(options.unRedeemed || options.redeemed){
				handleStatusFiltering(bundle, filterMe, options);
			}
			if(options.addlChoice && filterMe.product.choice_url ) {
				await handleChoiceData(bundle, filterMe.product.choice_url, options);
				if (!bundle.unRedeemed) {
					if ( bundle.choicesLeft <= 0 && !options.redeemed) {
						bundle = {};
					}
				}
			}
			
			if(options.direct || options.torrent){
				handleDownloadFiltering(bundle, filterMe, options);
			}

			if(Object.keys(bundle).length > 0){
				filtered.push( { [filterMe.product.human_name]:bundle } );
			}
		}
	}
	// WILL NEED TO ADD A FUNCTION, IT WILL CONVERT FROM JSON TO AN APPLICABLE FORMAT IF SAVING ISNT ".json" || "clipboard"
	readySave(JSON.stringify(filtered, null, 2)); 
}


function handleStatusFiltering (bundle, filterMe, options) {
	let redeemedTitles = {};
	let unRedeemedTitles = {};
	for (let i=0; i < filterMe.tpkd_dict.all_tpks.length; i++) { 
		const curTPKS = filterMe.tpkd_dict.all_tpks[i]; // data regarding each game
		const curName = curTPKS.human_name;
		if (  curTPKS.hasOwnProperty("redeemed_key_val") ){
			if (options.redeemed){
				redeemedTitles[curName] = {};
				redeemedTitles[curName].key = curTPKS.redeemed_key_val;
				addAppID(redeemedTitles[curName], curTPKS, options);
				addRestrictions(redeemedTitles[curName], curTPKS, options);
			}
		} else if (curTPKS.length === 0 && filterMe.subproducts[0].library_family_name === "hidden" || curTPKS.is_expired){ // some "expired keys" only have the "hidden" name and still contain the key. Length check discludes them from here
			if (options.redeemed){
				redeemedTitles[curName] = {};	
				redeemedTitles[curName].key = "Expired";
				addAppID(redeemedTitles[curName], curTPKS, options);
				addRestrictions(redeemedTitles[curName], curTPKS, options);
			}
		} else if (options.unRedeemed){
			unRedeemedTitles[curName] = {};
			addAppID(unRedeemedTitles[curName], curTPKS, options);
			addRestrictions(unRedeemedTitles[curName], curTPKS, options);
		}
		if (Object.keys(redeemedTitles).length > 0){
			bundle.redeemed = redeemedTitles;
		}
		if (Object.keys(unRedeemedTitles).length > 0){
			bundle.unRedeemed = unRedeemedTitles;
		}
	}
}


function addAppID (gamesObj, curTPKS, options) {
	if(options.appID && curTPKS.steam_app_id !== null){
		gamesObj.SteamAppID = curTPKS.steam_app_id;
	}
}


function addRestrictions (gamesObj, curTPKS, options) {
	if(options.restrictions) {
		if( curTPKS.exclusive_countries.length > 0 ){
			gamesObj.exclusive_countries = curTPKS.exclusive_countries;
		} else if (curTPKS.disallowed_countries.length > 0){
			gamesObj.disallowed_countries = curTPKS.disallowed_countries;
		}
	}
}


function addDeliveryMethods (gamesObj, choice, options) {
	if(options.deliveryMethods && choice.delivery_methods !== null){
		gamesObj.delivery_methods = choice.delivery_methods;
	}
}


function addGenres (gamesObj, choice, options) {
	if(options.genres && choice.genres !== null){
		gamesObj.genres = choice.genres;
	}
}


async function handleChoiceData (bundle, choice_url, options) {

	const url = `https://www.humblebundle.com/subscription/${choice_url}`;
	const response = await fetch(url);
	const textPromise = await response.text();

	const parser = new DOMParser();
	const doc = parser.parseFromString( textPromise, 'text/html');

	const elWebpack = doc.getElementById("webpack-monthly-product-data");
		
	let monthlyData;

	if (elWebpack && elWebpack.innerText && elWebpack.innerText.includes('contentChoiceOptions') ) { // two people have mentioned an error / innerText not there 
		monthlyData = await JSON.parse(elWebpack.innerText).contentChoiceOptions;
	} else {
		console.log(url, 'did not correctly fetch'); // should display urls/bundles that are causing issues / no innerText
		return // end this loop iteration, data not there / innerText not found
	}

	let initPath = "initial";
	if (monthlyData.contentChoiceData["initial-get-all-games"]) {
		initPath = "initial-get-all-games";
	}

	if (monthlyData.usesChoices) {
		bundle.startingChoices = monthlyData.contentChoiceData[initPath].total_choices; // amount of choices available according to purchase plan???
	} else {
		filterChoiceless(bundle, monthlyData, options); // COULD JUST BE FOR CURRENTMONTHLY??? MAYBE IT'S A NEW FORMAT???
		return
	}

	let choicesMade = [];
	if (monthlyData.contentChoicesMade) {
		choicesMade = monthlyData.contentChoicesMade[initPath].choices_made; // array of machine names of game/s that have been redeemed by using choices
		bundle.choicesUsed = choicesMade.length;
		bundle.choicesLeft = (bundle.startingChoices - bundle.choicesUsed) || 0;
		// The object that "choice_url" comes from also contains "choices_remaining", which could be used to output said data.
	} else {
		bundle.choicesUsed = 0;
		bundle.choicesLeft = bundle.startingChoices;
	}

	if (options.unRedeemed && bundle.choicesLeft >= 1 || options.redeemed) { // prevents adding unMadeChoices to bundles when necessary
		const allChoices =  monthlyData.contentChoiceData[initPath].content_choices; // all choices for that month
		const choicesLeft = [];
		for (const choice in allChoices ) {
			if (!choicesMade.includes(choice)) {
				choicesLeft.push(allChoices[choice])
			}
		}

		let choices = {};
		choicesLeft.map( (choice) => {
			choices[choice.title] = {};

			let choiceTpkds = [];
			if (choice.tpkds) {
				choiceTpkds = choice.tpkds[0];
			} else {
				if (choice.nested_choice_tpkds) {
					if (choice.nested_choice_tpkds[`${choice.display_item_machine_name}_steam`]){
						choiceTpkds = choice.nested_choice_tpkds[`${choice.display_item_machine_name}_steam`][0];
					}
				}
			}

			addAppID( choices[choice.title], choiceTpkds, options );
			addRestrictions( choices[choice.title], choiceTpkds, options );
			addDeliveryMethods( choices[choice.title], choice, options );
			addGenres( choices[choice.title], choice, options );
		});
		
		bundle.unMadeChoices = choices;
	}
}


function filterChoiceless( bundle, monthlyData, options ) {

	let initPath = "initial";
	if (monthlyData.contentChoicesMade["initial-get-all-games"]) {
		initPath = "initial-get-all-games";
	} else if (!monthlyData.contentChoicesMade["initial"]) {
		console.log("choiceLess initPath has changed, review for changes.");
	}

	if (monthlyData.contentChoiceData["initial-get-all-games"]) {
		console.log("choiceLess filtering initpath now like the other monthly choices")
	} else if (monthlyData.contentChoiceData["initial"]) {
		console.log("choiceLess filtering initpath now like the other monthly choices");
	}


	let choicesMade = [];
	if (monthlyData.contentChoicesMade) {
		choicesMade = monthlyData.contentChoicesMade[initPath].choices_made; // array of machine names of game/s that have been redeemed
	}

	if (options.unRedeemed || options.redeemed) { // prevents adding unMadeChoices to bundles when necessary
		const allChoices =  monthlyData.contentChoiceData.game_data; // all choices for that month
		const choicesLeft = [];
		for (const choice in allChoices ) {
			if (!choicesMade.includes(choice)) {
				choicesLeft.push(allChoices[choice])
			}
		}

		let choices = {};
		choicesLeft.map( (choice) => {
			choices[choice.title] = {};

			let choiceTpkds = [];
			if (choice.tpkds) {
				choiceTpkds = choice.tpkds[0];
			} else {
				if (choice.nested_choice_tpkds) {
					if (choice.nested_choice_tpkds[`${choice.display_item_machine_name}_steam`]){
						choiceTpkds = choice.nested_choice_tpkds[`${choice.display_item_machine_name}_steam`][0];
					}
				}
			}

			addAppID( choices[choice.title], choiceTpkds, options );
			addRestrictions( choices[choice.title], choiceTpkds, options );
			addDeliveryMethods( choices[choice.title], choice, options );
			addGenres( choices[choice.title], choice, options );
		});
		
		bundle.unMadeChoices = choices;
		bundle.isChoiceLess = true;
	}
}


function handleDownloadFiltering (bundle, filterMe, options) {
	for(let i=0; i < filterMe.subproducts.length; i++){
		const subProduct = filterMe.subproducts[i];
		for (let n = 0; n < subProduct.downloads.length; n++){
			const dlPlatform = subProduct.downloads[n].platform;
			if ( options.platform === "all" || options.platform === dlPlatform ){
				const curTitle = subProduct.human_name;
				if(options.direct){
					const dlLink = subProduct.downloads[n].download_struct[0].url.web;
					addDownloads(bundle, dlLink, dlPlatform, curTitle, "direct");
				}
				if (options.torrent){
					const dlLink = subProduct.downloads[n].download_struct[0].url.bittorrent;
					addDownloads(bundle, dlLink, dlPlatform, curTitle, "torrent");
				}
			}
		}
	}
}


function getRedemptiontatus (bundle, curTitle) {
	if(bundle.hasOwnProperty("redeemed") && bundle.redeemed.hasOwnProperty(curTitle) ){
		return "redeemed"
	} else if (bundle.hasOwnProperty("unRedeemed") && bundle.unRedeemed.hasOwnProperty(curTitle) ){
		return "unRedeemed"
	} else {
		return "other"
	}
}


function addDownloads (bundle, dlLink, dlPlatform, curTitle, path) {
	const redemption = getRedemptiontatus(bundle, curTitle);
	const keyPath = [redemption, curTitle, "downloads", dlPlatform];
	addProp(bundle, keyPath);
	bundle[redemption][curTitle].downloads[dlPlatform][path] = dlLink;
}


function addProp(objToCheck, checkAdd) {
	if(objToCheck.hasOwnProperty(checkAdd[0]) === false){
		objToCheck[checkAdd[0]] = {};
	}
	if(checkAdd.length > 1) {
		const removed = checkAdd.shift();
		addProp(objToCheck[removed], checkAdd);
	}
}