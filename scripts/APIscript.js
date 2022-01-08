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


function filterApiData(toFilter, options){
	let filtered = [];
	for(let i=0; i<toFilter.length; i++){
		const filterMe = toFilter[i];
		if( options[filterMe.product.category] ) { 
			let bundle = {};
			if(options.unRedeemed || options.redeemed){
				handleStatusFiltering(bundle, filterMe, options);
			}
			/*
			if( filterMe.product.choice_url ) ){ // I will need to modify my current scraper to do this or build a new.  Choices currently only return redeemed keys and games included with the choice (that don't require using a choice)
				// should gather data like, choices remaining of total choices, remaining choice titles & their appId & restrictions if applicable
			} */
			
			if(options.direct || options.torrent){
				handleDownloadFiltering(bundle, filterMe, options);
			}

			if(Object.keys(bundle).length > 0){
				filtered.push( { [filterMe.product.human_name]:[bundle] } );
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
				addRestrictions(redeemedTitles, curName, curTPKS, options);
			}
		} else if (curTPKS.length === 0 && filterMe.subproducts[0].library_family_name === "hidden" || curTPKS.is_expired){ // some "expired keys" only have the "hidden" name and still contain the key. Length check discludes them from here
			if (options.redeemed){
				redeemedTitles[curName] = {};	
				redeemedTitles[curName].key = "Expired";
				addAppID(redeemedTitles[curName], curTPKS, options);
				addRestrictions(redeemedTitles, curName, curTPKS, options);
			}
		} else if (options.unRedeemed){
			unRedeemedTitles[curName] = {};
			addAppID(unRedeemedTitles[curName], curTPKS, options);
			addRestrictions(unRedeemedTitles, curName, curTPKS, options);
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


function addRestrictions (titlesObj, curName, curTPKS, options) {
	if(options.restrictions) {
		if( curTPKS.exclusive_countries.length > 0 ){
			titlesObj[curName].exclusive_countries = curTPKS.exclusive_countries;
		} else if (curTPKS.disallowed_countries.length > 0){
			titlesObj[curName].disallowed_countries = curTPKS.disallowed_countries;
		}
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
					if(bundle.hasOwnProperty("redeemed") && bundle.redeemed.hasOwnProperty(curTitle) ){
						addDownloads(bundle, subProduct, dlPlatform, n, curTitle, "redeemed");
					} else if (bundle.hasOwnProperty("unRedeemed") && bundle.unRedeemed.hasOwnProperty(curTitle) ){
						addDownloads(bundle, subProduct, dlPlatform, n, curTitle, "unRedeemed");
					} else {
						addDownloads(bundle, subProduct, dlPlatform, n, curTitle, "other");
					}
				}
				if (options.torrent){
					if(bundle.hasOwnProperty("redeemed") && bundle.redeemed.hasOwnProperty(curTitle) ){
						addDownloads(bundle, subProduct, dlPlatform, n, curTitle, "redeemed");
					} else if (bundle.hasOwnProperty("unRedeemed") && bundle.unRedeemed.hasOwnProperty(curTitle) ){
						addDownloads(bundle, subProduct, dlPlatform, n, curTitle, "unRedeemed");
					} else {
						addDownloads(bundle, subProduct, dlPlatform, n, curTitle, "other");
					}
				}
			}
		}
	}
}


function addDownloads (bundle, subProduct, dlPlatform, i, curTitle, redemption) {
	let keyPath = [curTitle, "downloads", dlPlatform];

	keyPath.unshift(redemption);
	bundle = ifNoPropAdd(bundle, keyPath);
	bundle[redemption][curTitle].downloads[dlPlatform].direct = subProduct.downloads[i].download_struct[0].url.web;
}


function ifNoPropAdd(objToCheck, checkAdd){
	for(let i=0; i< checkAdd.length; i++){
		if(objToCheck.hasOwnProperty(checkAdd[0]) === false){
			objToCheck[checkAdd[0]] = {};
		} else if (objToCheck[checkAdd[0]].hasOwnProperty(checkAdd[1]) === false ){
			objToCheck[checkAdd[0]][checkAdd[1]] = {};
		} else if (objToCheck[checkAdd[0]][checkAdd[1]].hasOwnProperty(checkAdd[2]) === false){
			objToCheck[checkAdd[0]][checkAdd[1]][checkAdd[2]] = {};
		} else if (objToCheck[checkAdd[0]][checkAdd[1]][checkAdd[2]].hasOwnProperty(checkAdd[3]) === false){
			objToCheck[checkAdd[0]][checkAdd[1]][checkAdd[2]][checkAdd[3]] = {};
		}
	}
	return objToCheck;
}