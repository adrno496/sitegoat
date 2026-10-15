// srcdoc resolves relative anchors against the parent URL. Keep the original
// href attributes and cancelled defaults for edition scripts, but perform native fragment navigation
// against the current opaque document instead of loading the PWA in the frame.
export const LOCAL_FRAGMENT_LINK_BRIDGE = `(()=>{
  for(const type of ['click','auxclick']) window.addEventListener(type,event=>{
    const link=event.target instanceof Element?event.target.closest('a[href],area[href]'):null;
    const fragment=link?.getAttribute('href');
    if(event.defaultPrevented||!fragment?.startsWith('#')||link.matches('[data-ai-link="google-ai-mode"]'))return;
    event.preventDefault();
    if(type!=='click'||event.button!==0)return;
    location.hash=fragment;
    let id=fragment.slice(1);try{id=decodeURIComponent(id)}catch{}
    const target=document.getElementById(id)||document.getElementsByName(id)[0];
    if(target)target.scrollIntoView();else if(!id)window.scrollTo(0,0);
  });
})();`;
