class Boundary extends React.Component{
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(e){return {err:e};}
  render(){
    if(this.state.err)return <div style={{padding:60,textAlign:'center',color:'#ff5468',fontFamily:'monospace'}}>
      StaffClock hit an error: {String(this.state.err&&this.state.err.message||this.state.err)}
      <br/><br/><button className="btn" onClick={()=>location.reload()}>Reload</button>
    </div>;
    return this.props.children;
  }
}
ReactDOM.createRoot(document.getElementById('root')).render(<Boundary><App/></Boundary>);