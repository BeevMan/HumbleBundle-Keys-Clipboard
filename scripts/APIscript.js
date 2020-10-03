async function apiCall() {
	const opts = await getExtOptions( apiOptions );
	if (compatibleOptsCheck(opts) !== true) {
		return;
	}
	console.log("options are compatible");

	const userOrders = await fetch("https://www.humblebundle.com/api/v1/user/order");
	const orderKeys = await userOrders.json(); 
	let orderPromises= [];
	orderKeys.forEach(order => orderPromises.push(fetch("https://www.humblebundle.com/api/v1/order/" + order.gamekey + "?all_tpkds=true")));
	

	const responses = await Promise.all( orderPromises); 
	const data = await Promise.all(responses.map(function (response) {
		return response.json();
	}));


	if(opts.allApiData){
		// WILL NEED TO ADD A FUNCTION, IT WILL CONVERT FROM JSON TO AN APPLICABLE FORMAT IF SAVING !== ".json" || "clipboard"
		readySave(JSON.stringify(data, null, 2));
		console.log("finished!");
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
		if (options.storefront === false && options.bundle === false && options.subscriptioncontent === false) {
			return alert("Please choose a purchase type in HumbleBundle Keys Clipboard's options.");
		} else if (options.direct || options.torrent || options.unRedeemed || options.redeemed) {
			// options should be compatible
			return true;
		} else {
			return alert("Please choose a download type or title redemption status in HumbleBundle Keys Clipboard's options.");
		}
	}
}


function filterApiData(toFilter, options){
	let filtered = [];
	console.log("starting filtering");
	for(let i=0; i<toFilter.length; i++){
		if( options[toFilter[i].product.category] ) { 
			let bundle = {};
			if(options.unRedeemed || options.redeemed){
				let redeemedTitles = {};
				let unRedeemedTitles = {};
				for (let j=0; j < toFilter[i].tpkd_dict.all_tpks.length; j++) { 
					const curTPKS = toFilter[i].tpkd_dict.all_tpks[j];
					const curName = curTPKS.human_name;
					if (  curTPKS.hasOwnProperty("redeemed_key_val") ){	
						if (options.redeemed){
							redeemedTitles[curName] = {};
							redeemedTitles[curName].key = curTPKS.redeemed_key_val;
							if(options.appID && curTPKS.steam_app_id !== null){
								redeemedTitles[curName].SteamAppID = curTPKS.steam_app_id;
							}
							if(options.restrictions){
								if( curTPKS.exclusive_countries.length > 0 ){
									redeemedTitles[curName].exclusive_countries = curTPKS.exclusive_countries;
								} else if (curTPKS.disallowed_countries.length > 0){
									redeemedTitles[curName].disallowed_countries = curTPKS.disallowed_countries;
								}
							}
						}
					} else if (curTPKS.length === 0 && toFilter[i].subproducts[0].library_family_name === "hidden" || curTPKS.is_expired){
						if (options.redeemed){
							redeemedTitles[curName] = {};
							redeemedTitles[curName].key = "Expired"
							if(options.appID && curTPKS.steam_app_id !== null){
								redeemedTitles[curName].SteamAppID = curTPKS.steam_app_id;
							}
							if(options.restrictions){
								if( curTPKS.exclusive_countries.length > 0 ){
									redeemedTitles[curName].exclusive_countries = curTPKS.exclusive_countries;
								} else if (curTPKS.disallowed_countries.length > 0){
									redeemedTitles[curName].disallowed_countries = curTPKS.disallowed_countries;
								}
							}
						}
					} else if (options.unRedeemed){
						unRedeemedTitles[curName] = {};
						if(options.appID && curTPKS.steam_app_id !== null){
							unRedeemedTitles[curName].SteamAppID = curTPKS.steam_app_id;
						}
						if(options.restrictions){
							if( curTPKS.exclusive_countries.length > 0 ){
								unRedeemedTitles[curName].exclusive_countries = curTPKS.exclusive_countries;
							} else if (curTPKS.disallowed_countries.length > 0){
								unRedeemedTitles[curName].disallowed_countries = curTPKS.disallowed_countries;
							}
						}
					}
					if (Object.keys(redeemedTitles).length > 0){
						bundle.redeemed = redeemedTitles;
					}
					if (Object.keys(unRedeemedTitles).length > 0){
						bundle.unRedeemed = unRedeemedTitles;
					}
					
				}
			}
			/*
			if( toFilter[i].product.human_name.endsWith("Choice") ){ // I will need to modify my current scraper to do this or build a new.  Choices currently only return redeemed keys and games included with the choice (that don't require using a choice)

			} */
			
			if(options.direct || options.torrent){
				for(let j=0; j < toFilter[i].subproducts.length; j++){
					const subProduct = toFilter[i].subproducts[j];
					for (let n = 0; n < subProduct.downloads.length; n++){
						const dlPlatform = subProduct.downloads[n].platform;
						if ( options.platform === "all" || options.platform === dlPlatform ){
							const curTitle = subProduct.human_name;
							if(options.direct){
								let keyPath = [curTitle, "downloads", dlPlatform];
								if(bundle.hasOwnProperty("redeemed") && bundle.redeemed.hasOwnProperty(curTitle) ){
									keyPath.unshift("redeemed");
									bundle = ifNoPropAdd(bundle, keyPath);
									bundle.redeemed[curTitle].downloads[dlPlatform].direct = subProduct.downloads[n].download_struct[0].url.web;
								} else if (bundle.hasOwnProperty("unRedeemed") && bundle.unRedeemed.hasOwnProperty(curTitle) ){
									keyPath.unshift("unRedeemed");
									bundle = ifNoPropAdd(bundle, keyPath);
									bundle.unRedeemed[curTitle].downloads[dlPlatform].direct = subProduct.downloads[n].download_struct[0].url.web;
								} else {
									keyPath.unshift("other");
									bundle = ifNoPropAdd(bundle, keyPath);
									bundle.other[curTitle].downloads[dlPlatform].direct = subProduct.downloads[n].download_struct[0].url.web;
								}
							}
							if (options.torrent){
								let keyPath = [curTitle, "downloads", dlPlatform];
								if(bundle.hasOwnProperty("redeemed") && bundle.redeemed.hasOwnProperty(curTitle) ){
									keyPath.unshift("redeemed");
									bundle = ifNoPropAdd(bundle, keyPath);
									bundle.redeemed[curTitle].downloads[dlPlatform].torrent = subProduct.downloads[n].download_struct[0].url.bittorrent;
								} else if (bundle.hasOwnProperty("unRedeemed") && bundle.unRedeemed.hasOwnProperty(curTitle) ){
									keyPath.unshift("unRedeemed");
									bundle = ifNoPropAdd(bundle, keyPath);
									bundle.unRedeemed[curTitle].downloads[dlPlatform].torrent = subProduct.downloads[n].download_struct[0].url.bittorrent;
								} else {
									keyPath.unshift("other");
									bundle = ifNoPropAdd(bundle, keyPath);
									bundle.other[curTitle].downloads[dlPlatform].torrent = subProduct.downloads[n].download_struct[0].url.bittorrent;
								}
							}
						}
					}
				}

			}
			if(Object.keys(bundle).length > 0){
				let namedBundle = {};
				namedBundle[toFilter[i].product.human_name] = bundle;
				filtered.push(namedBundle);
			}
		} else {
			toFilter.splice(i,1);
			--i;
		}
	}
	// WILL NEED TO ADD A FUNCTION, IT WILL CONVERT FROM JSON TO AN APPLICABLE FORMAT IF SAVING ISNT ".json" || "clipboard"
	readySave(JSON.stringify(filtered, null, 2)); 
	console.log("finished filtering!");
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