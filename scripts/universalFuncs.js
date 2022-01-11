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
	const opts = await getExtOptions( {saving: '.txt', fileName: 'hbKeysClipboard', APIenable: false} );
	
	if(opts.saving === "clip"){
		clipboard(toSave)
	} else if (opts.APIenable === false){
		let blob = new Blob([toSave], {type: "text/plain;charset=utf-8"});
		saveAs(blob, opts.fileName + ".text");
	} else {
		let blob = new Blob([toSave], {type: "text/plain;charset=utf-8"});
		saveAs(blob, opts.fileName + opts.saving);
	};
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


async function addButton(){
	const options = await getExtOptions( {iconButton: true, APIenable: false} );
	const buttOpt = options.iconButton ?? true;
	let icon;
	
	if (buttOpt !== false) {
		if (chrome.runtime){
			icon = chrome.runtime.getURL('icons/32-clipboard.png');
		} else {
			icon = "moz-extension://<extension-UUID>/32-clipboard.png";
		};
	}
	let btn = document.createElement("label");
	if (icon === undefined) {
		let button = document.createElement("button");
		button.type = "button";
		button.innerText = "List to clipboard.";
		btn.appendChild(button);
	} else {
		let inpt = document.createElement("input");
		inpt.type = "image";
		inpt.src = `${icon}`;
		inpt.alt = "List to clipboard."
		btn.appendChild(inpt);
	}
	if (options.APIenable === true){
		btn.addEventListener("click", apiCall);
	} else {
	    btn.addEventListener("click", copyList);
	}
	document.getElementsByClassName("sort")[0].appendChild(btn);
};

addButton();