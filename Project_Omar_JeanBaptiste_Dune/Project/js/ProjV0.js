var ctx = {
    map_side: 400,
    w: 800,
    h: 800,
    countries: [],
    rivers: [],
    lakes: [],
    time_markers : [{id: 0, start: -1000}, {id: 1, start: -500}, {id: 2, start: 0}, {id: 3, start: 500}, {id: 4, start: 1000}, {id: 5, start: 1500}, {id:6, start: 2000}],
    start_date: -1000,
    end_date: 2020,
    country: null,
    author: null,
    work: null,
    data: null,
    work_of_art: null,
    data_authors: null,
    author_list: null,
    level: -1,
    nb_authors: 20
}

var projection = d3.geoOrthographic().scale(ctx.map_side/2).translate([ctx.map_side/2+100,ctx.map_side/2+100]);
var Proj_path = d3.geoPath().projection(projection);
var start = -1000;
var end = 2020;
var length = 250;
var time_scale = d3.scaleLinear([start, end], [50, ctx.map_side+length-15]);
const SPHERE = { type: 'Sphere' };
let transform = d3.zoomIdentity;

function createViz() {
    console.log("Using D3 v"+d3.version);
    console.log("screen height", screen.availHeight)
    d3.select("body")
      .on("keydown", function(event, d){handleKeyEvent(event);});
    svgTime = d3.select("#timeline").append("svg")
        .attr("transform", "translate(625,-140)");
    svgBand = d3.select("#dataBand").append("svg");
    svgMap = d3.select("#globe").append("svg").attr("id", "svgMap");
    svgInfo = d3.select("#data").append("svg").attr("id", "svgInfo");
    svgOthers = d3.select("#miscellaneous").append("svg").attr("id", "svgOthers");
    svgTitle = d3.select("#title").append("svg");
    load_map(svgMap);
    loadData();
    create_title(svgTitle);
    create_timeline(svgTime);
};

function getVisibility(d) {
  const visible = Proj_path(
    {type: 'Point', coordinates: [d.lat_long[1], d.lat_long[0]]});

  return visible ? 'visible' : 'hidden';
};

function load_map(svgEl){
    svgEl.attr("width", ctx.map_side+200)
          .attr("height", ctx.map_side+200)
          .attr("transform", "translate(675,-1090)");
    Promise.all([d3.json("ne_110m_admin_0_countries.geojson")
                ,d3.json("ne_110m_lakes.geojson")
                ,d3.json("ne_110m_rivers_lake_centerlines.geojson")
              ])
          .then(function(data) {
              ctx.countries = data[0].features;
              ctx.lakes = data[1].features;
              ctx.rivers = data[2].features;

              const initialScale = projection.scale();
              const sensitivity = 60;

              svgEl.append("g")
                    .attr("id", "map")
                    .append("circle")
                    .attr("id", "globe")
                    .style("fill", "#678983")
                    .attr("cx", ctx.map_side/2+100)
                    .attr("cy", ctx.map_side/2+100)
                    .attr("r", initialScale)
                    .attr("opacity", 1)
                    .on("click", function(event, d) {if (ctx.level==1 && ctx.country==null) {ctx.author=null;}
                                                     d3.selectAll("path.country").transition().style("fill", "#f6edae");
                                                     ctx.country = null;
                                                     ctx.level=1;
                                                     ctx.work=null;
                                                     populate(d3.select("#svgMap"), d3.select("#svgInfo"), d3.select("#svgOthers"));}

                    );

              d3.select("#map")
                .call(d3.drag().on('drag', (event) => {
                      const rotate = projection.rotate()
                      const k = sensitivity / projection.scale()
                      projection.rotate([
                          rotate[0] + event.dx * k,
                          rotate[1] - event.dy * k
                      ])
                      path = d3.geoPath().projection(projection)
                      d3.select("#map").selectAll("path").attr("d", path)
                      d3.select("#pins").selectAll("image").attr("transform", (d)=>pin_transform(d));
                      d3.select("#pins").selectAll("image").attr("visibility", (d)=>(getVisibility(d)));
                }))
                .call(d3.zoom().on('zoom', (event) => {
                    if(event.transform.k > 0.3) {
                        projection.scale(initialScale * event.transform.k)
                        path = d3.geoPath().projection(projection)
                        d3.select("#map").selectAll("path").attr("d", path)
                        d3.select("#map").select("#globe").attr("r", projection.scale())
                        d3.select("#pins").selectAll("image").attr("transform", (d)=>pin_transform(d))
                    }
                    else {
                        d3.event.transform.k = 0.3
                    }
                }))
              Add_countries();
              Add_water();

           });
};


function Add_countries() {
    d3.select("#map")
      .selectAll("path.country")
      .data(ctx.countries)
      .enter()
      .append("path")
      .attr("d", Proj_path)
      .attr("class", "country")
      .attr("opacity", 1)
      .style("fill", "#f6edae")
      .on("click", function(event, d) {
          if (ctx.level==1 && ctx.country==d.properties.name) {
              ctx.country=null;
              d3.select(this).transition().style("fill", "#f6edae");
          }
          else {
              d3.selectAll("path.country").transition().style("fill", "#f6edae");
              d3.select(this).transition().style("fill", "#de425b");
              ctx.level=1;
              ctx.work=null;
              ctx.country = d.properties.name;}
          populate(d3.select("#svgMap"), d3.select("#svgInfo"), d3.select("#svgOthers"))
      });

};


function Add_water() {
    d3.select("#map")
      .selectAll("path.river")
      .data(ctx.rivers)
      .enter()
      .append("path")
      .attr("d", Proj_path)
      .attr("class", "river")
      .attr("stroke", "#678983")
      .attr("fill", "none");
    d3.select("#map")
      .selectAll("path.lake")
      .data(ctx.lakes)
      .enter()
      .append("path")
      .attr("d", Proj_path)
      .attr("class", "lake")
      .attr("stroke", "#678983")
      .attr("fill", "#678983");
};

function create_title(svgEl) {
  svgEl.attr("width", 800)
       .attr("height", 150)
       .append("text")
       .attr("x", 20)
       .attr("y", 100)
       .text("Projet INF552");
};

function create_timeline(svgEl) {

    var start_time = ctx.start_date;
    var end_time = ctx.end_date;
    var x_start = 23;
    var x_end = ctx.map_side+length-7;
    let click = false;
    var points = [{x: x_start, y:45}, {x: x_start+5, y:50}, {x: x_end-5, y:50}, {x: x_end, y:45}, {x: x_end-5, y:40}, {x: x_start+5, y:40}, {x: x_start, y:45}]
    var points_rect = [{x:x_start, y:40}, {x:x_end, y:40}, {x:x_end, y:50}, {x:x_start, y:50}];
    var margin_up = 780;
    var margin_down = 830;
    var Gen_curve = d3.line()
        .x((p) => p.x)
        .y((p) => p.y)
        .curve(d3.curveBundle.beta(1));
    var Gen_straight = d3.line()
        .x((p) => p.x)
        .y((p) => p.y)
        .curve(d3.curveLinearClosed);


    const defs = svgEl.attr("width", ctx.map_side+length+50)
        .attr("height", 100)
        .append("defs");

    defs.append("clipPath")
       .attr("id", "ellipse_clip")
       .append("path")
       .attr("d", Gen_curve(points));

    svgEl.append("text")
       .attr("id", "start_text")
       .attr("x", 50)
       .attr("y", 40)
       .text(start_time);

    svgEl.append("text")
       .attr("id", "end_text")
       .attr("x", ctx.map_side+length-40)
       .attr("y", 40)
       .text(end_time);

    svgEl.selectAll("g")
       .data(ctx.time_markers)
       .enter()
       .append("g")
       .attr("class", "marker")
       .append("text")
       .text((d)=>{return d.start.toString();})
       .attr("transform", (d)=>{ return `translate(${time_scale(d.start)-15},65) rotate(45)`});

    svgEl.selectAll("path")
       .data(ctx.time_markers)
       .enter()
       .append("path")
       .attr("class", "line_marker")
       .attr("d", (d)=>{return d3.line()([[time_scale(d.start)+3, 55],[time_scale(d.start)+3,48]])})
       .attr("stroke", "#181D31")
       .attr("stroke-width", "1");

    svgEl.append("path")
       .attr("clip-path", "url(#ellipse_clip)")
       .attr("id", "frise")
       .attr("d", Gen_curve(points))
       .attr("stroke", "#181d31")
       .attr("stroke-width", "0.5")
       .attr("fill", "#e98055")
       .attr("opacity", 0.4);

    svgEl.append("path")
       .attr("clip-path", "url(#ellipse_clip)")
       .attr("id", "color")
       .attr("d", Gen_straight(points_rect))
       .style("fill", "#e98055");


    window.addEventListener('mousedown', e => {
        if (e.clientX <= ctx.map_side+length+3 && e.clientX >= 33  && e.clientY <margin_down  && e.clientY >margin_up){
            click = true;
            x_start = e.clientX-10;
            x_end = e.clientX-10;
        };
    });

    window.addEventListener('mousemove', e => {
        if (click) {
            if (e.clientX <= ctx.map_side+length+3 && e.clientX >= 33  && e.clientY <margin_down  && e.clientY > margin_up){
                x_end=e.clientX-10;
            };
            let points_rect_2 = [{x:x_start, y:40}, {x:x_end, y:40}, {x:x_end, y:50}, {x:x_start, y:50}];

            d3.select("#color")
              .attr("d", Gen_straight(points_rect_2));
            start_time = Math.floor(time_scale.invert(x_start));
            end_time = Math.floor(time_scale.invert(x_end));
            d3.select("#start_text")
              .text(Math.min(start_time, end_time));

            d3.select("#end_text")
              .text(Math.max(start_time,end_time));
        };
    });

    window.addEventListener('mouseup', e => {
        click = false;
        if (e.clientX >= ctx.map_side+length+3 || e.clientX <= 33  || e.clientY >margin_down  || e.clientY < margin_up) {
            update_timeline(svgEl, time_scale(ctx.start_date), time_scale(ctx.end_date))
        }
        else {
            if (x_end < x_start) {
                let tmp = x_end;
                x_end = x_start;
                x_start = tmp;
            }
            update_timeline(svgEl, x_start, x_end);
        }
    });
};

function update_timeline(svgEl, x_start, x_end) {
    var Gen_straight = d3.line()
        .x((p) => p.x)
        .y((p) => p.y)
        .curve(d3.curveLinearClosed);
    let points_rect_2 = [{x:x_start, y:40}, {x:x_end, y:40}, {x:x_end, y:50}, {x:x_start, y:50}];

    d3.select("#color")
      .attr("d", Gen_straight(points_rect_2));
    start_time = Math.floor(time_scale.invert(x_start));
    end_time = Math.floor(time_scale.invert(x_end));
    d3.select("#start_text")
      .text(start_time);

    d3.select("#end_text")
      .text(end_time);
    ctx.start_date = start_time;
    ctx.end_date = end_time;
    if (ctx.level==2) {ctx.level=1; ctx.work=null;}
    populate(d3.select("#svgMap"), d3.select("#svgInfo"), d3.select("#svgOthers"));
};


var set_start_date = function(){
    var sampleVal = document.querySelector('#Start_date').value;
    if (sampleVal.trim()===''){
        return;
    }
    update_timeline(d3.select("#svgTime"), time_scale(sampleVal), time_scale(ctx.end_date));
};

var set_end_date = function(){
    var sampleVal = document.querySelector('#End_date').value;
    if (sampleVal.trim()===''){
        return;
    }
    update_timeline(d3.select("#svgTime"), time_scale(ctx.start_date), time_scale(sampleVal));
};


function loadData() {
    d3.json("data6.json").then(function(data){
    console.log(`Processing ${data.length} works of art...`);
    ctx.data = data;
    ctx.data_authors=[];
    for (let i=0; i< ctx.data.length; i++) {
        let flag =true;
        let j=0;
        ctx.data[i].authors.birth_year = parseInt(ctx.data[i].authors.birth_year.slice(0,4));
        ctx.data[i].authors.death_year = parseInt(ctx.data[i].authors.death_year.slice(0,4));
        while (flag && j<ctx.data_authors.length) {
            if (ctx.data[i].authors.name==ctx.data_authors[j].name) {
                flag=false;
            };
            j++;
        };
        if (flag) {ctx.data_authors.push(ctx.data[i].authors);ctx.data_authors[ctx.data_authors.length-1]['pop']=0;}
    }
    populate(svgMap,svgInfo,svgOthers);
    create_map(svgMap);
    create_work(svgInfo);
    create_authors(svgOthers);
    ctx.level = 0;
  });
};

function populate(map, works, authors) {
    console.log("author :", ctx.author, " work :", ctx.work, " country :", ctx.country, " k :",ctx.level)
    ctx.work_of_art = ctx.data.filter((d) => (ctx.start_date<d.date && ctx.end_date>d.date));
    ctx.author_list=ctx.data_authors;
    ctx.author_list = ctx.data_authors.filter((d) => (ctx.start_date<=d.birth_year && ctx.end_date>=d.birth_year
        || ctx.start_date<=d.death_year && ctx.end_date>=d.death_year));
    if (ctx.work != null) {ctx.work_of_art = ctx.work_of_art.filter((d) => (d.id == ctx.work));}
    else {
        if (ctx.author != null) {ctx.work_of_art = ctx.work_of_art.filter((d) => (d.authors.name == ctx.author));};
        if (ctx.country != null) {ctx.work_of_art = ctx.work_of_art.filter((d) => (d.authors.country == ctx.country));}
        for (let i=0; i< ctx.work_of_art.length; i++) {
            if (ctx.author_list.filter((d)=>(d.name==ctx.work_of_art[i].authors.name)).length != 0) {
                ctx.author_list.filter((d)=>(d.name==ctx.work_of_art[i].authors.name))[0]['pop'] = Math.max(ctx.author_list.filter((d)=>(d.name==ctx.work_of_art[i].authors.name))[0]['pop'], ctx.work_of_art[i]["popularity "]);
            };
        }
        var author_sort = function(a,b) {
            return a.pop-b.pop;
        };
        ctx.author_list = ctx.author_list.sort(author_sort);
    };

      console.log("Populate: ctx.woa", ctx.work_of_art);

    if (ctx.level!=-1) {
        update_map(map);
        update_works(works);
        update_authors(authors);
    };
};

function create_image() {
    console.log("create image", ctx.author);
    try {
        const image = document.createElementNS("http://www.w3.org/2000/svg", 'image');
        d3.select("#svgInfo")
            .attr("transform", "translate(1350, -1250)")
            .attr("width", 450)
            .attr("height", 300)
            .append("image")
            .attr("id", "picture")
            .attr("transform", "translate(75,0)")
            .attr('xlink:href',ctx.work_of_art[0].image)
            .attr('width', 300)
            .attr('height', 300)
            .on("click", function(e, d) {
                ctx.level=3;
                if(ctx.level == 3){
                  /*ctx.level=2;
                    d3.select("#svgInfo")
                       .attr("transform", "scale(0.25, 0.25)")*/

                } else {
                  /*ctx.level=3;
                    d3.select("#svgInfo")
                    .attr("transform", "scale(4, 4)")*/
                }

                ctx.work=null;
                populate(d3.select("#svgMap"), d3.select("#svgInfo"), d3.select("#svgOthers"));
            });;}
    catch (error) {console.log("error");}
};


function pin_transform(d) {
    [x,y]=projection([d.lat_long[1], d.lat_long[0]]);
    let t = `translate(${x-6},${y-6})`;
    return t
};

function update_map(svgEl) {
    d3.select("#pins")
      .selectAll("image")
      .data(ctx.work_of_art, (d)=>(d.id))
      .join(
          enter =>(
            enter.append("image")
                 .attr("transform", pin_transform)
                 .attr("width", 14)
                 .attr("height", 14)
                 .attr("xlink:href", "Pin1.png")
                 .attr("fill", "none")
                 .attr("visibility", getVisibility)
                 .on("click", function(e, d) {
                      ctx.level = 2;
                      ctx.work = d.id;
                      ctx.author = d.authors.name;
                      populate(svgEl, d3.select("#svgInfo"), d3.select("#svgOthers"));
                  })
                 .append("title")
                 .text((d)=>(d.name+", "+d.authors.name))
          ),
          update => (
            update.attr("transform", pin_transform)
          ),
          exit => (
            exit.remove()
          )
    )
};


function update_works(svgEl) {
    d3.select("#picture").remove();
    for (let i=0; i<10; i++) {
        d3.select(`#work${i + 1}`)
          .select("tspan")
          .text("")
          .attr("text-anchor", "middle");
    };
    if (ctx.level==2) {
        console.log("ctx2")
        let txt = ctx.work_of_art[0].name;
        if (txt.length>50) {txt = txt.slice(0,23)+"...";}
        d3.select("#Work_list")
            .attr("visibility", "hidden");
        d3.select("#Work_info")
            .attr("visibility", "visible")
            .select("#Pieces_title")
            .on("click", function(e) {
            ctx.level = 1;
            if (ctx.author == null) {
                ctx.level = 0;
            }
            ctx.work = null;
            populate(d3.select("#svgMap"), d3.select("#svgInfo"), d3.select("#svgOthers"));})
            .select("tspan")
            .text(txt)
            .attr("text-anchor", "middle");
        d3.select("#data_slug")
            .select("tspan")
            .text("context :" + ctx.work_of_art[0].slug)
            .attr("text-anchor", "middle")
        d3.select("#data_museum")
            .select("tspan")
            .text("museum :" + ctx.work_of_art[0].museum.location)
            .attr("text-anchor", "middle")

        d3.select("#data_technique")
            .select("tspan")
            .text("technique :" + ctx.work_of_art[0].techniques[0])
            .attr("text-anchor", "middle")
        d3.select("#data_place")
            .select("tspan")
            .text("place :" + ctx.work_of_art[0].exact_adress)
            .attr("text-anchor", "middle")
        d3.select("#data_date")
            .select("tspan")
            .text("date :" + ctx.work_of_art[0].date)
            .attr("text-anchor", "middle")
        d3.select("#data_author")
            .select("tspan")
            .text("author :" + ctx.work_of_art[0].authors.name)
            .attr("text-anchor", "middle")

        create_image();
    }
    else {
        d3.select("#Work_list")
            .attr("visibility", "visible");
        d3.select("#Work_info")
            .attr("visibility", "hidden")
        for (let i=0; i<10; i++) {
            d3.select(`#work${i + 1}`)
            .select("tspan")
            .text("")
            .attr("text-anchor", "middle");
            if (i<ctx.work_of_art.length) {
                let txt = ctx.work_of_art[i].name;
                if (txt.length>50) {txt = txt.slice(0,47)+"...";}
                // Fig
                d3.select(`#work${i + 1}`)
                .select("tspan")
                .text(txt)
                .attr("text-anchor", "middle");
                d3.select(`#work${i + 1}`).attr("data", ctx.work_of_art[i].id)
                    .on("click", function(e) {
                    ctx.level=2;
                    ctx.work = d3.select(this).attr("data");
                    populate(d3.select("#svgMap"), d3.select("#svgInfo"), d3.select("#svgOthers"));
                });
            }
        }
    }
};


function update_authors(svgEl) {
    for (let i=0; i<ctx.nb_authors; i++) {
        d3.select(`#Author_${i + 1}`).text(ctx.author_list[i].name);
        d3.select(`#Author_${i + 1}`).attr("data", ctx.author_list[i].name)
        // Fig
        d3.select(`#Author${i + 1}`)
        .attr("data", ctx.author_list[i].name)
        .select("tspan")
        .text(ctx.author_list[i].name)
        .attr("text-anchor", "middle");
    }
};


function create_map(svgEl) {
    svgEl.append("svg")
      .attr("id", "pins");
    update_map(svgEl);
};

function create_work(svgEl) {
    for (let i=0; i<10; i++) {
        let txt = ctx.work_of_art[i].name;
        if (txt.length>50) {txt = txt.slice(0,47)+"...";}
        d3.select(`#work${i + 1}`)
        .select("tspan")
        .text(txt)
        .attr("text-anchor", "middle");
    }
};

function create_authors(svgEl) {
    /// Fig change for right colors
    for (let i=0; i<ctx.nb_authors; i++) {
        d3.select(`#Author${i + 1}`).attr("fill", "#181D31")
            .attr("data", ctx.author_list[i].name)
            .select("tspan")
            .text(ctx.author_list[i].name)
            .attr("text-anchor", "middle");

            d3.select(`#Author${i + 1}`).on("click", function(e, data) {
                if (ctx.level==1 && ctx.author==d3.select(this).attr("data")) {
                    ctx.level=0;
                    ctx.author=null;
                    ctx.work=null;
                    for (let j=0; j<ctx.nb_authors; j++) {
                        d3.select(`#Author${j}`).style("fill", "#181D31");
                      }
                }
                else {
                    ctx.level=1;
                    ctx.author=d3.select(this).attr("data");
                    ctx.work=null;
                    for (let j=0; j<ctx.nb_authors; j++) {
                        d3.select(`#Author${j + 1}`).style("fill", "#181D31");
                      }
                    d3.select(`#Author${i + 1}`).style("fill", "#e98055")
                };
                populate(d3.select("#svgMap"), d3.select("#svgInfo"), d3.select("#svgOthers"));
            });
    }
};
