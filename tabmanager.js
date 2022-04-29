let isDown = false;
let isClosed = false;
let drag = false;
let div = null;
let tabIdtoTab = {};
const positionKey = 'position';
const lasttabsKey = 'lasttabs';

spacingX = 100;
spacingY = 125;
offsetY = 5;

let tabsElement = document.getElementById("tabs");
let dockContainer = document.getElementById("dock-container");

window.addEventListener('mouseup', mouseUp, true);

function showMenu() {
    document.getElementById("buymeacoffee").classList.toggle("show");
}

document.getElementById("menu").addEventListener('click', showMenu);

htmlEscape = (str) => {
    const entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    return String(str).replace(/[&<>"'`=\/]/g, (s) => entityMap[s]);
};

function getIcon(tab) {
    let altFavicon = `data:image/svg+xml,%3Csvg%20xmlns=\'http://www.w3.org/2000/svg\'%20viewBox=\'0%200%2016%2016\'%3E%3Ctext%20x=\'0\'%20y=\'14\'%3E${tab.title[0]}%3C/text%3E%3C/svg%3E`;
    let icon = tab.favIconUrl // || altFavicon;
    if (icon == null || icon === "" || icon == undefined || icon === "undefined") {
        icon = "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&size=128&url=" + tab.url;
    }
    return icon;
}

// get tabs from browser
function refresh() {
    tabsElement.innerHTML = '';
    chrome.tabs.query({}, function (tabs) {
        // get tabs from storage, or none if not stored yet
        let maxXpos = 0;
        let maxYpos = 0;
        localforage.getItem(positionKey).then(function (storedTabs) {
            // restore positions from local storage
            if (storedTabs && !window.isPopup) {
                tabs.forEach(function (tab) {
                    storedTabs.forEach(function (storedTab) {
                        if (tab.id === storedTab.id) {
                            tab.position = storedTab.position || tab.position;
                            tab.favIconUrl = storedTab.favIconUrl;

                            maxXpos = Math.max(maxXpos, storedTab.position[0] || 0);
                            maxYpos = Math.max(maxYpos, storedTab.position[1] || 0);
                        }
                    });
                });
            }

            storedTabs = tabs;

            // render tabs
            let x = 0;
            let y = 0;
            let maxX = window.innerWidth / (spacingX + 5);
            let i = 0;
            storedTabs.filter(tab => !tab.url.startsWith('chrome')).forEach(tab => {
                i = i + 1;
                const newTab = document.createElement('div');

                newTab.innerHTML += `
                <a href="#" class="close-btn" tabindex="-1" id="close"></a>
                <a class="bookmarkLink" data-id="link" draggable="false" id="bookmarkLink">
                    <div class="iconContainer" draggable="false" id="iconContainer">
                        <img class="icon" id="icon" data-id="image" draggable="false" src="${htmlEscape(getIcon(tab))}" alt="${tab.title}">
                    </div>
                    <div class="name" id="name" data-id="name" draggable="false">
                        <span id="span">
                            ${htmlEscape(tab.title)}
                        </span>
                    </div>
                </a>    
            `;

                newTab.addEventListener('mousedown', mouseDown, true);
                newTab.children[0].addEventListener('mousedown', close, true);

                newTab.getElementsByClassName('icon')[0].addEventListener('error', image_error, true);

                newTab.addEventListener('mouseover', focusin, true);
                newTab.addEventListener('mouseout', focusout, true);

                newTab.style.position = 'absolute';
                let X = x * spacingX + 5;
                let offset = tabsElement.offsetTop + offsetY;
                if (maxYpos > 0) {
                    offset = maxYpos + spacingY;
                }
                let Y = y * spacingY + offset;
                if (tab.position) {
                    X = tab.position[0];
                    Y = tab.position[1];
                } else {
                    tab.position = [X, Y];
                    // if (!window.isPopup){
                    //     newTab.style.background = 'rgba(100, 200, 255, 0.1)';
                    // }

                    x = x + 1;
                    if (x >= maxX) {
                        x = 0;
                        y = y + 1;
                    }
                }
                newTab.style.left = X + 'px';
                newTab.style.top = Y + 'px';
                newTab.draggable = true;
                newTab.className = 'bookmarkBox';
                newTab.tabIndex = 0;
                newTab.id = tab.id;

                tabIdtoTab[newTab.id] = tab;

                tabsElement.appendChild(newTab);

            });
            dockContainer.innerHTML = '';
            let items = 0;
            localforage.getItem(lasttabsKey).then(function (lastTabs) {
                if (lastTabs) {
                    storedTabs.filter(tab => lastTabs.includes(tab.id) && !tab.url.startsWith('chrome')).sort((a, b) => (lastTabs.findIndex(x => x === a.id) > lastTabs.findIndex(x => x === b.id) ? 1 : -1)).slice(0, 10).forEach(tab => {
                        const newDock = document.createElement('li');
                        newDock.innerHTML += `
                        <a href="#">
                            <div class="dockIconContainer">
                                <img class="ico" src="${getIcon(tab)}" alt="">
                            </div>
                        </a>
                        <div class="numberCircle">
                        ` + ((items + 1) % 10) + `
                        </div>
                        `;
                        newDock.addEventListener('mousedown', mouseDown, true);
                        newDock.addEventListener('mouseup', mouseUp, true);
                        newDock.id = tab.id;
                        dockContainer.appendChild(newDock);
                        items = items + 1;
                    });
                }
            }).finally( function () {
                if (!window.isPopup) {
                    const newDock = document.createElement('li');
                    newDock.innerHTML += `
                    <div class="dockIconContainer">
                        <img class="ico" src="icons/refresh.svg" alt="">
                    </div>
                    `;
                    newDock.addEventListener('mousedown', reset, true);
                    dockContainer.appendChild(newDock);
                    items = items + 1;
                }
                if (window.isPopup) {
                    document.getElementsByTagName('body')[0].style.width = (items * 60) + 'px';
                }

            });
        });
    });
}
refresh();

function reset(event) {
    if(confirm("Reset ?")){
        localforage.removeItem(positionKey).then(function() {
            // Run this code once the key has been removed.
            console.log('Key is cleared!');
        }).catch(function(err) {
            // This code runs if there were any errors
            console.log(err);
        });
        localforage.removeItem(lasttabsKey).then(function() {
            // Run this code once the key has been removed.
            console.log('Key is cleared!');
            refresh();
        }).catch(function(err) {
            // This code runs if there were any errors
            console.log(err);
        });
    }
}

function focusin(event) {
    let el = event.target;
    while ((el = el.parentElement) && !el.classList.contains('bookmarkBox'));
    el.children[0].classList.add('close-thin');
    document.getElementById('icon_description').innerText = el.textContent.trim();
}

function focusout(event) {
    let el = event.target;
    while ((el = el.parentElement) && !el.classList.contains('bookmarkBox'));
    el.children[0].classList.remove('close-thin');
    document.getElementById('icon_description').innerText = '';
}

document.onkeydown = function (e) {
    let activeTab = document.activeElement;
    // open selected tab on space key
    if (activeTab.id && e.keyCode == 32) {
        chrome.tabs.update(parseInt(activeTab.id), {active: true});
    }
    if (e.keyCode == 39) {
        if (activeTab.className === 'bookmarkBox') {
            let nextTab = activeTab.nextElementSibling;
            if (nextTab) {
                nextTab.focus();
            } else {
                activeTab.parentElement.children[0].focus();
            }
        } else {
            document.getElementById('tabs').children[0].focus();
        }
        e.preventDefault();
    }
    if (e.keyCode == 37) {
        let nextTab = activeTab.previousElementSibling;
        if (nextTab) {
            nextTab.focus();
        } else {
            activeTab.parentElement.children[0].focus();
        }
        e.preventDefault();
    }
    if (e.keyCode == 38) {
        let nextTab = activeTab.parentElement.previousElementSibling;
        if (nextTab) {
            nextTab.children[0].focus();
        } else {
            activeTab.parentElement.parentElement.children[0].children[0].focus();
        }
        e.preventDefault();
    }
    if (e.keyCode == 40) {
        let nextTab = activeTab.parentElement.nextElementSibling;
        if (nextTab) {
            nextTab.children[0].focus();
        } else {
            activeTab.parentElement.parentElement.children[0].children[0].focus();
        }
        e.preventDefault();
    }
    // press 1 - 9 to switch to tab
    if (e.keyCode >= 49 && e.keyCode <= 57) {
        chrome.tabs.update(parseInt(dockContainer.children[e.keyCode - 49].id), {active: true});
    }
    // press 0
    if (e.keyCode === 48) {
        chrome.tabs.update(parseInt(dockContainer.children[9].id), {active: true});
    }
};

function image_error(e) {
    let altFavicon = `data:image/svg+xml,%3Csvg%20xmlns=\'http://www.w3.org/2000/svg\'%20viewBox=\'0%200%2016%2016\'%3E%3Ctext%20x=\'0\'%20y=\'14\'%3E${e.target.alt[0].toUpperCase()}%3C/text%3E%3C/svg%3E`;
    e.target.src = altFavicon;
}


function mouseUp() {
    isDown = false;
    if (div != null && div.id != null) {
        if (!drag && !isClosed) {
            chrome.tabs.update(parseInt(div.id), {active: true});
            div = null;
        }
        else {
            div.removeEventListener('mousemove', mouseMove, true);
            if (tabIdtoTab[parseInt(div.id)] != null) {
                tabIdtoTab[parseInt(div.id)].position = [div.offsetLeft, div.offsetTop];
                if (!window.isPopup) {
                    localforage.setItem(positionKey, Object.values(tabIdtoTab));
                }
                div.style.zIndex = '0';
            }
        }
    }
    isClosed = false;
}

function close(event) {
    chrome.tabs.remove(tabIdtoTab[parseInt(event.target.parentElement.id)].id, function() {
        tabsElement.removeChild(event.target.parentElement);
        isClosed = true;
    });
}

function mouseDown(e) {
    isDown = true;
    drag = false;
    div = e.target.parentElement.parentElement.parentElement;
    offset = [
        div.offsetLeft - e.clientX,
        div.offsetTop - e.clientY
    ];
    div.addEventListener('mousemove', mouseMove, true);
    div.style.zIndex = "10";
}

function mouseMove(event) {
    drag = true;
    event.preventDefault();
    if (isDown) {
        let mousePosition = {
            x : event.clientX,
            y : event.clientY
        };
        div.style.left = (mousePosition.x + offset[0]) + 'px';
        div.style.top  = (mousePosition.y + offset[1]) + 'px';
    }
}

function startTime() {
    const today = new Date();
    let options = { weekday: 'short',  month: 'short', day: 'numeric'};
    let h = today.getHours();
    let m = today.getMinutes();
    m = checkTime(m);
    document.getElementById('clock').innerHTML =  today.toLocaleDateString("en-US", options) + '&nbsp;&nbsp;&nbsp;' + h + ':' + m;
    setTimeout(startTime, 1000);
}

function checkTime(i) {
    if (i < 10) {i = "0" + i};  // add zero in front of numbers < 10
    return i;
}

if (!window.isPopup) {
    startTime();
}

chrome.tabs.onActivated.addListener(() => {
    refresh();
});
