self.importScripts('libs/localforage.min.js');

chrome.tabs.onActivated.addListener(function(activeInfo) {
    localforage.getItem('lasttabs').then(function (lastTabs) {
        if (lastTabs && lastTabs.length > 0) {
           if (lastTabs[0] != activeInfo.tabId) {
               lastTabs.unshift(activeInfo.tabId);
               if (lastTabs.length > 100) {
                   lastTabs.pop();
               }
               localforage.setItem('lasttabs', lastTabs);
           }
        } else {
           localforage.setItem('lasttabs', [activeInfo.tabId]);
        }
    });
});
