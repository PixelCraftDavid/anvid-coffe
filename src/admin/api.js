export async function adminRequest(view,payload) {
  let response;
  try{response=await fetch(`/api/admin${view?`?${new URLSearchParams(view)}`:''}`,{method:payload?'POST':'GET',credentials:'same-origin',cache:'no-store',...(payload?{headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}:{})});}
  catch{throw new Error('No hay conexión con el panel. Revisa tu red y vuelve a intentar.');}
  if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('El panel aún se está preparando. Vuelve a intentar en un momento.');
  const data=await response.json();
  if(!response.ok){const error=new Error(data.error||'No pudimos completar la solicitud.');error.status=response.status;throw error;}
  return data;
}
