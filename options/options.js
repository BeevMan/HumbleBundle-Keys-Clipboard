async function saveOptions(elOption) {
		let choice = elOption.value;
		if (elOption.id === "saving" && await savingPermissionCheck(elOption) === false){
			return restoreOptions();
		} else if (elOption.type === "checkbox") {
			choice = elOption.checked;
		} 
		chrome.storage.sync.set({[elOption.id]: choice});
		if (elOption.id === "APIenable" || elOption.id === "allApiData"){
			hideOrDisplayOpts();
		}
}


function hideOrDisplayOpts(){
	const isApiEnabled = document.getElementById('APIenable').checked;
	const getAll = document.getElementById('allApiData'); // if getAll.checked is true, apiFilters should be hidden
	const apiOnly = document.getElementsByClassName('apiOnly'); // only to be shown when isApiEnabled is true
	const scraperOnly = document.getElementsByClassName("scraperOnly"); 
	if (isApiEnabled){
		Object.keys(apiOnly).forEach(key => apiOnly[key].removeAttribute("hidden"));
		Object.keys(scraperOnly).forEach(key => scraperOnly[key].setAttribute("hidden", true));

		chrome.storage.sync.get({ // restores saving option, incase user had json selected when turning APIenable off
			saving: '.txt',
			}, function(items) {
			document.getElementById('saving').value = items.saving;
			});

		const apiFilters = document.getElementById("apiFilters");
		if (getAll.checked){
			apiFilters.setAttribute("hidden", true)
		} else {
			apiFilters.removeAttribute("hidden");
		}

	} else { // while it's using the scraper script i.e APIenable is blank

		Object.keys(apiOnly).forEach(key => apiOnly[key].setAttribute("hidden", true));
		Object.keys(scraperOnly).forEach(key => scraperOnly[key].removeAttribute("hidden"));

		const savingOpt = document.getElementById('saving');
		if (savingOpt.value === ".json" || savingOpt.value === ".csv"){
			savingOpt.value = '.txt';
		}
	}
};


async function savingPermissionCheck(elIDSaving){
	let permissionStatus;
	const clipPermission = {permissions: ['clipboardWrite']};
	if (elIDSaving.value === "clip"){
		permissionStatus = await extPermission("contains", clipPermission);
		if (permissionStatus !== true){
			permissionStatus = await extPermission("request", clipPermission);
			if(permissionStatus !== true){
				return permissionStatus;
			}
		}
	} else {
		await extPermission("remove", clipPermission);
	}
}; 


function extPermission(method, permission) { 
    return new Promise((resolve, reject) => {
        try {
            chrome.permissions[method](permission, function (value) {
                resolve(value);
            })
        }
        catch (ex) {
            reject("Permission promise failed.");
        }
    });
};



const defOptions = {
	APIenable: false,
	saving: '.txt',
	fileName: 'hbKeysClipboard',
	iconButton: true,
	fetchChoices: true,
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


function restoreOptions(defOpts) {
	chrome.storage.sync.get(
		defOpts
	, function(options) {
			const opts = Object.keys(options);
			opts.forEach(function(opt){
				let curOpt = document.getElementById(opt);
					if(curOpt.type === "checkbox"){
						curOpt.checked = options[opt];
					} else {
						curOpt.value = options[opt];
					}
			  })
		hideOrDisplayOpts();
		});
}


function addOptionListeneres(){
	const elOptions = document.querySelectorAll('select, input');
	elOptions.forEach(opt =>  opt.addEventListener('change', (event) => {
		saveOptions(opt)
	}));	
};


document.addEventListener('DOMContentLoaded', restoreOptions(defOptions));
document.addEventListener('DOMContentLoaded', addOptionListeneres);