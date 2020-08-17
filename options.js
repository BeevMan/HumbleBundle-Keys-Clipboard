async function saveOptions(elOption) {
		let choice = elOption.value;
		if (elOption.id === "saving" && await savingPermissionCheck(elOption) === false){
			return restoreOptions();
		} else if (elOption.type === "checkbox") {
			choice = elOption.checked;
		}
		chrome.storage.sync.set({[elOption.id]: choice});
}


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


function restoreOptions() {
	chrome.storage.sync.get({
		saving: 'txt',
		fileName: 'hbKeysToClipboard',
		iconButton: true,
		fetchChoices: true
		}, function(items) {
		document.getElementById('saving').value = items.saving;
		document.getElementById('fileName').value = items.fileName;
		document.getElementById('iconButton').checked = items.iconButton;
		document.getElementById('fetchChoices').checked = items.fetchChoices;
		});
}


function addOptionListeneres(){
	const elOptions = document.querySelectorAll('select, input');
	elOptions.forEach(opt =>  opt.addEventListener('change', (event) => {
		saveOptions(opt)
	}));
};


document.addEventListener('DOMContentLoaded', restoreOptions());
document.addEventListener('DOMContentLoaded', addOptionListeneres);