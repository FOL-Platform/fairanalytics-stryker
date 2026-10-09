(() => {
  'use strict';
  const page = document.body.dataset.page;
  const cfg = window.FAIR_CONFIG || {};
  const message = document.getElementById('message');
  function show(text, kind='error') { if (message) {message.textContent=text; message.className='message show '+kind;} }
  function ready() {return cfg.supabaseUrl?.startsWith('https://') && !cfg.supabaseUrl.includes('REPLACE_') && cfg.supabasePublishableKey?.startsWith('sb_publishable_') && window.supabase?.createClient;}
  if (!ready()) {show('Site setup is incomplete: configure config.js with your Supabase Project URL and publishable key.'); if(page==='dashboard') document.getElementById('loading-content').textContent='Supabase configuration is missing. Update config.js.'; return;}
  const sb = window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
  const to = filename => new URL(filename, window.location.href).href;
  const friendly = err => err?.message || 'An unexpected error occurred.';
  async function getSession() {const {data,error}=await sb.auth.getSession();if(error)throw error;return data.session;}
  async function boot() {
    if (page==='login') {
      const session=await getSession();
      if(session){window.location.replace(to('dashboard.html'));return;}
      document.getElementById('login-form').addEventListener('submit',async e=>{
        e.preventDefault(); const btn=document.getElementById('login-button');btn.disabled=true;
        const {error}=await sb.auth.signInWithPassword({email:document.getElementById('email').value.trim(),password:document.getElementById('password').value});
        btn.disabled=false; if(error) return show(friendly(error));
        window.location.assign(to('dashboard.html'));
      });
      document.getElementById('forgot-button').addEventListener('click',async()=>{
        const email=document.getElementById('email').value.trim(); if(!email)return show('Enter your email address above, then click Forgot your password.');
        const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:to('setup-password.html')});
        if(error) return show(friendly(error));
        show('If this email is eligible, a password reset link will arrive shortly.','ok');
      });
    }
    if(page==='setup') {
      const hash=new URLSearchParams(location.hash.replace(/^#/,''));
      const query=new URLSearchParams(location.search);
      if(hash.get('error')||query.get('error'))return show(hash.get('error_description')||query.get('error_description')||'Your link is invalid or expired. Request a fresh one.');
      // Supabase browser SDK processes implicit invite/recovery hash fragments automatically.
      // For PKCE flows, the SDK also processes code on initialization when it has the verifier.
      let session;
      try{session=await getSession();}catch(error){return show(friendly(error));}
      if(!session)return show('No valid invitation or recovery session was found. Please open a fresh email link; if you already have an account, use Forgot your password on the sign-in page.');
      // Once a valid session exists, remove tokens from the browser address bar.
      if(location.hash||location.search) history.replaceState(null,'',location.pathname);
      document.getElementById('setup-description').textContent='Signed in as '+(session.user.email||'invited user')+'. Choose your new password.';
      document.getElementById('setup-form').classList.remove('hidden');
      document.getElementById('setup-form').addEventListener('submit',async e=>{
        e.preventDefault(); const p=document.getElementById('new-password').value; const confirm=document.getElementById('confirm-password').value;
        if(p.length<12)return show('Use a password of at least 12 characters.');
        if(p!==confirm)return show('Passwords do not match.');
        const btn=document.getElementById('setup-button');btn.disabled=true;
        const {error}=await sb.auth.updateUser({password:p});btn.disabled=false;
        if(error)return show(friendly(error));
        document.getElementById('setup-form').classList.add('hidden');
        show('Password saved. Redirecting to your workspace…','ok');
        window.location.replace(to('dashboard.html'));
      });
    }
    if(page==='dashboard') {
      const session=await getSession();
      if(!session){window.location.replace(to('index.html'));return;}
      // Check territory assignment with user's JWT; RLS blocks cross-territory reads.
      const {data,error}=await sb.from('territory_access').select('access_role,territories!inner(territory_name,customer_name)').eq('user_id',session.user.id).eq('territories.customer_name','Stryker').eq('territories.territory_name','New England').limit(1);
      if(error||!data?.length){await sb.auth.signOut();window.location.replace(to('index.html'));return;}
      document.getElementById('signed-in-as').textContent=`${session.user.email} · ${data[0].access_role} access`;
      document.getElementById('loading-content').classList.add('hidden');
      document.getElementById('dashboard-content').classList.remove('hidden');
      document.getElementById('logout-button').addEventListener('click',async()=>{await sb.auth.signOut();window.location.replace(to('index.html'));});
    }
  }
  boot().catch(e=>show(friendly(e)));
})();
