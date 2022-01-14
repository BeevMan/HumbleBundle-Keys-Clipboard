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
	let filtered = [];
	for(let i=0; i<toFilter.length; i++){
		const filterMe = toFilter[i];
		if( options[filterMe.product.category] ) { 
			let bundle = {}; 
			if(options.unRedeemed || options.redeemed){
				handleStatusFiltering(bundle, filterMe, options);
			}
			if(options.addlChoice && filterMe.product.choice_url ) {
				await handleChoiceData(bundle, filterMe.product.choice_url, options);
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


async function handleChoiceData (bundle, choice_url, options) {

	const url = `https://www.humblebundle.com/subscription/${choice_url}`;
	const response = await fetch(url);
	const textPromise = await response.text();

	const parser = new DOMParser();
	const doc = parser.parseFromString( textPromise, 'text/html');

	const monthlyData = await JSON.parse(doc.getElementById("webpack-monthly-product-data").innerText).contentChoiceOptions;

	bundle.maxChoices = monthlyData.MAX_CHOICES; // amount of choices available according to purchase plan???  Does not go past 10? even if they let you redeem all 12 games that month.


	let initPath = "initial";
	if (monthlyData.contentChoiceData["initial-get-all-games"]) {
		initPath = "initial-get-all-games";
		bundle.maxChoices = Object.keys(monthlyData.contentChoiceData[initPath].content_choices).length
	}

	let choicesMade = [];
	if (monthlyData.contentChoicesMade) {
		choicesMade = monthlyData.contentChoicesMade[initPath].choices_made; // array of machine names of game/s that have been redeemed by using choices
		bundle.choicesUsed = choicesMade.length;
		// The object that "choice_url" comes from also contains "choices_remaining", which could be used to output said data.
	} else {
		bundle.choicesUsed = 0;
	}

	const allChoices =  monthlyData.contentChoiceData[initPath].content_choices; // all choices for that month
	let choicesLeft = [];
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
	});
	
	bundle.unMadeChoices = choices;
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
					if(bundle.hasOwnProperty("redeemed") && bundle.redeemed.hasOwnProperty(curTitle) ){
						addDownloads(bundle, dlLink, dlPlatform, curTitle, "redeemed", "direct");
					} else if (bundle.hasOwnProperty("unRedeemed") && bundle.unRedeemed.hasOwnProperty(curTitle) ){
						addDownloads(bundle, dlLink, dlPlatform, curTitle, "unRedeemed", "direct");
					} else {
						addDownloads(bundle, dlLink, dlPlatform, curTitle, "other", "direct");
					}
				}
				if (options.torrent){
					const dlLink = subProduct.downloads[n].download_struct[0].url.bittorrent;
					if(bundle.hasOwnProperty("redeemed") && bundle.redeemed.hasOwnProperty(curTitle) ){
						addDownloads(bundle, dlLink, dlPlatform, curTitle, "redeemed", "torrent");
					} else if (bundle.hasOwnProperty("unRedeemed") && bundle.unRedeemed.hasOwnProperty(curTitle) ){
						addDownloads(bundle, dlLink, dlPlatform, curTitle, "unRedeemed", "torrent");
					} else {
						addDownloads(bundle, dlLink, dlPlatform, curTitle, "other", "torrent");
					}
				}
			}
		}
	}
}


function addDownloads (bundle, dlLink, dlPlatform, curTitle, redemption, path) {
	let keyPath = [curTitle, "downloads", dlPlatform];

	keyPath.unshift(redemption);
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