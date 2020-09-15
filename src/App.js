import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import I from 'immutable';
import {hot} from "react-hot-loader";

import './App.css';

function say(...args) {
  console.log(...args);
}

// SVG circle element to draw a node of the airfoil path.
//
// i: integer (0, 1, ... number of nodes - 1) node number.
// pos: {x, y} position of node.
// begin_node_move: callback on mouse down to start moving the node.
//
// To make it easier to click on the node, a slightly larger
// transparent circle is drawn behind the node to provide a larger
// click target.

function Node({i, pos, begin_node_move}) {
  return (
    // data-i is used to identify the node being clicked on.
    <React.Fragment>
      <circle
        data-i={i}
        cx={pos.x}
        cy={pos.y}
        r={12 / 600}
        fill="transparent"
        onPointerDown={begin_node_move}/>
      <circle
        data-i={i}
        cx={pos.x}
        cy={pos.y}
        r={8 / 600}
        stroke="#555"
        strokeWidth={ 5 / 600 }
        fill="#ddd"
        onPointerDown={begin_node_move}/>
    </React.Fragment>);
}

// All the nodes of the airfoil path.
//
// node_positions: Immutable.List of {x, y} positions.
// begin_node_move: callback on mouse down to start moving a node.

function Nodes({node_positions, begin_node_move}) {
  return node_positions.map(function (pos, i) {
    return <Node
             key={"" + i}
             i={i}
             pos={pos}
             begin_node_move={begin_node_move}/>;
  });
}

// An anchor for one of the nodes on the airfoil path.
//
// i: integer (0, 1, ... number of nodes - 1) node number of this anchor.
// a: 0 = left anchor of node; 1 = right anchor of node.
// pos: {x, y} position of anchor.
// begin_anchor_move: callback on mouse down to start moving the anchor.
//
// A slightly larger transparent circle is drawn behind the anchor to
// provide a larger click target to make it easier to click on the
// anchor.

function Anchor({i, a, pos, begin_anchor_move}) {
  // data-i (node number) and data-a (0 = left anchor, 1 = right
  // anchor) is used to identify the anchor being clicked on.
  return (
    <React.Fragment>
      <circle
        data-i={i}
        data-a={a}
        cx={pos.x}
        cy={pos.y}
        r={ 10 / 600 }
        fill="transparent"
        onPointerDown={begin_anchor_move}/>
      <circle
        data-i={i}
        data-a={a}
        cx={pos.x}
        cy={pos.y}
        r={ 6 / 600 }
        stroke="#888"
        strokeWidth={ 5 / 600 }
        fill="#ffffff"
        onPointerDown={begin_anchor_move}/>
    </React.Fragment>
  );
}

// All the anchors on the airfoil path.
//
// anchor_positions: Immutable.List of {x, y} positions.
// begin_anchor_move: callback on mouse down to start moving the anchor.

function Anchors({anchor_positions, begin_anchor_move}) {
  return anchor_positions.map(function (point, i) {
    return (
      <React.Fragment key={i}>
        <Anchor
          key={"L" + i}
          i={i}
          a={0}
          pos={point.get(0)}
          begin_anchor_move={begin_anchor_move}/>,
        <Anchor
          key={"R" + i}
          i={i}
          a={1}
          pos={point.get(1)}
          begin_anchor_move={begin_anchor_move}/>,
      </React.Fragment>
    );
  });
}

// Draws the dashed line from an anchor to its node.

function AnchorLine({i, a, node_pos, anchor_pos}) {
  return (
    // By default, clicking on a dashed line above a node or anchor
    // would register the click as being applied to the dashed line.
    // By setting pointer-events to none, the mouse click will pass
    // through the line and be registered by the underlying node or
    // anchor.
    <line
      x1={node_pos.x}
      y1={node_pos.y}
      x2={anchor_pos.x}
      y2={anchor_pos.y}
      stroke="#888"
      strokeWidth={ (1 / 600) + "px" }
      strokeDasharray={"0.01 0.01"}
      pointerEvents="none"/>
  );
}


function AnchorLines({n_nodes, node_positions, anchor_positions}) {
  return (
    <React.Fragment>
      {range(n_nodes, function (i) {
        const node_pos = node_positions.get(i);
        const left_anchor_pos = anchor_positions.get(i).get(0);
        const right_anchor_pos = anchor_positions.get(i).get(1);

        return (
          <React.Fragment key={i}>
            <AnchorLine
              i={i}
              a={0}
              node_pos={node_pos}
              anchor_pos={left_anchor_pos}/>
            <AnchorLine
              i={i}
              a={1}
              node_pos={node_pos}
              anchor_pos={right_anchor_pos}/>
          </React.Fragment>
        );
      })}
    </React.Fragment>
  );
}


function keep_within(x, bound) {
  return Math.min(Math.max(x, 0), bound);
}

function range(n, f) {
  const result = [];
  for (let i = 0; i < n; ++i) {
    result.push(f(i));
  }
  return result;
}

function trace_airfoil_points(n_points) {
  const airfoil = document.getElementById("airfoil");
  const length = airfoil.getTotalLength();
  return (
    range(n_points, function (i) {
      const point = airfoil.getPointAtLength((i / n_points) * length);
      return {x: point.x, y: point.y};
    }));
}

function curve(node_positions, anchor_positions, n_nodes, n) {
  const c0 = node_positions.get(n);
  const c1 = node_positions.get((n + 1) % n_nodes);
  const a0 = anchor_positions.get(n).get(1);
  const a1 = anchor_positions.get((n + 1) % n_nodes).get(0);

  return `M ${c0.x} ${c0.y} C ${a0.x} ${a0.y} ${a1.x} ${a1.y} ${c1.x} ${c1.y}`;
}

function curves(node_positions, anchor_positions, n_nodes) {
  return (
    range(n_nodes, function (i) {
      return curve(node_positions, anchor_positions, n_nodes, i);
    })
    .join(" "));
}

function CurvePath({
  n_nodes,
  node_positions,
  anchor_positions,
  n_airfoil_points,
  update_airfoil_points,
  set_update_airfoil_points,
  change_airfoil_points})
{
  useEffect(
    function () {
      if (update_airfoil_points) {
        change_airfoil_points(trace_airfoil_points(n_airfoil_points));
        set_update_airfoil_points(false);
      }
    },
    [update_airfoil_points, set_update_airfoil_points, change_airfoil_points, n_airfoil_points]);

  return (
    <path
      id="airfoil"
      d={curves(node_positions, anchor_positions, n_nodes)}
      stroke="#555"
      strokeWidth={ (4 / 600) + "px"}
      fill="none"/>
  );
}

function AirfoilDots({show_trace, airfoil_points}) {
  if (show_trace && airfoil_points) {
    return (
      <React.Fragment>
        {airfoil_points.map(function ({x, y}, i) {
          return (
            <circle
              key={"" + i}
              cx={x}
              cy={y}
              r={2 / 600}
              fill="red"
              pointerEvents="none"/>
          );
        })}
      </React.Fragment>
    );
  }
  else {
    return <React.Fragment/>;
  }
}


function initial_node_positions(n_nodes) {
  return I.List(range(n_nodes, function (i) {
    return {
      x: 0.5 + 200 / 600 * Math.cos(2 * Math.PI * (i / n_nodes)),
      y: 0.5 + 200 / 600 * Math.sin(2 * Math.PI * (i / n_nodes))
    };
  }));
}

function initial_anchor_position(node_position, angle) {
  const {x: node_x, y: node_y} = node_position;

  return {
    x: node_x + (30 / 600) * Math.cos(angle),
    y: node_y + (30 / 600) * Math.sin(angle)
  };
}


function initial_anchor_positions(n_nodes, node_positions) {
  return I.List(range(n_nodes, function (i) {
    const angle = 2 * Math.PI * i / n_nodes;

    return I.List([
      initial_anchor_position(node_positions.get(i), angle - 0.5 * Math.PI),
      initial_anchor_position(node_positions.get(i), angle + 0.5 * Math.PI)
    ]);
  }));
}


function Drawing({
    svg_size,
    n_airfoil_points,
    airfoil_points,
    change_airfoil_points,
    update_airfoil_points,
    set_update_airfoil_points,
    show_trace,
    n_nodes,
    node_positions,
    set_node_positions,
    anchor_positions,
    set_anchor_positions
  })
{
  const [moving_node, set_moving_node] = useState(null);
  const [moving_anchor, set_moving_anchor] = useState(null);

  function begin_node_move(e) {
    e.target.setPointerCapture(e.pointerId);
    set_moving_node(e.target.getAttribute("data-i"));
  }

  function begin_anchor_move(e) {
    e.target.setPointerCapture(e.pointerId);
    set_moving_anchor([
      e.target.getAttribute("data-i"),
      e.target.getAttribute("data-a")
    ]);
  }

  function end_node_move() {
    set_moving_node(null);
  }

  function end_anchor_move() {
    set_moving_anchor(null);
  }

  function end_move(e) {
    if (moving_node)
      end_node_move();
    else if (moving_anchor)
      end_anchor_move();
    set_update_airfoil_points(true);
  }

  const svg = useRef(null);

  function svg_to_screen(svg_pos) {
    const pt = svg.current.createSVGPoint();
    pt.x = svg_pos.x;
    pt.y = svg_pos.y;
    return pt.matrixTransform(svg.current.getScreenCTM());
  }

  function screen_to_svg(screen_pos) {
    const pt = svg.current.createSVGPoint();
    pt.x = screen_pos.x;
    pt.y = screen_pos.y;
    return pt.matrixTransform(svg.current.getScreenCTM().inverse());
  }

  function offset_svg_pos_by_screen_distance(pos, x, y) {
    const {x: screen_x, y: screen_y} = svg_to_screen(pos);

    const new_screen_x = screen_x + x;
    const new_screen_y = screen_y + y;

    return screen_to_svg({x: new_screen_x, y: new_screen_y});
  }

  function move_node(event) {
    const {x: node_x, y: node_y} =
      offset_svg_pos_by_screen_distance(
        node_positions.get(moving_node),
        event.movementX,
        event.movementY);

    if (node_x < 0.0 || node_x > 1.0 || node_y < 0.0 || node_y > 1.0)
      return;

    const {x: anchor1_x, y: anchor1_y} =
      offset_svg_pos_by_screen_distance(
        anchor_positions.get(moving_node).get(0),
        event.movementX,
        event.movementY);

    const {x: anchor2_x, y: anchor2_y} =
      offset_svg_pos_by_screen_distance(
        anchor_positions.get(moving_node).get(1),
        event.movementX,
        event.movementY);

    set_node_positions(
      node_positions.set(moving_node, {x: node_x, y: node_y}));

    set_anchor_positions(
      anchor_positions.set(
        moving_node,
        I.List([
          {x: anchor1_x, y: anchor1_y},
          {x: anchor2_x, y: anchor2_y}
        ])));
  }

  function move_anchor(event) {
    // The node of the anchor we're moving.

    const {x: node_x, y: node_y} =
      node_positions.get(moving_anchor[0]);

    // Retrieve both the anchor we're moving and the other anchor for
    // the node.

    const anchors = anchor_positions.get(moving_anchor[0]);

    const anchor = anchors.get(moving_anchor[1]);
    const mirror_anchor = anchors.get(1 - moving_anchor[1]);

    // Move the anchor being moved by the mouse offset distance, and
    // constrain to the workspace.

    const {x: new_x, y: new_y} =
      offset_svg_pos_by_screen_distance(
        anchor,
        event.movementX,
        event.movementY);

    const x = keep_within(new_x, 1.0);
    const y = keep_within(new_y, 1.0);

    // Move the other anchor to the mirror position.

    const mirror_x = node_x - (x - node_x);
    const mirror_y = node_y - (y - node_y);

    const new_anchors =
      anchors
      .set(moving_anchor[1], {x, y})
      .set(1 - moving_anchor[1], {x: mirror_x, y: mirror_y});

    set_anchor_positions(anchor_positions.set(moving_anchor[0], new_anchors));

  }

  function on_pointer_move(e) {
    if (moving_node)
      move_node(e);
    else if (moving_anchor)
      move_anchor(e);
  }

  return (
    <svg ref={svg}
         xmlns="http://www.w3.org/2000/svg"
         viewBox="0 0 1 1"
         className="absolute"
         height={svg_size + "px"}
         width={svg_size + "px"}
         onPointerUp={end_move}
         onPointerMove={on_pointer_move}
         style={{outline: "1px solid gray"}}>
      <CurvePath
        n_nodes={n_nodes}
        node_positions={node_positions}
        anchor_positions={anchor_positions}
        n_airfoil_points={n_airfoil_points}
        update_airfoil_points={update_airfoil_points}
        set_update_airfoil_points={set_update_airfoil_points}
        change_airfoil_points={change_airfoil_points}/>
      <Nodes
        node_positions={node_positions}
        begin_node_move={begin_node_move}/>
      <Anchors
        anchor_positions={anchor_positions}
        begin_anchor_move={begin_anchor_move}/>
      <AnchorLines
        n_nodes={n_nodes}
        node_positions={node_positions}
        anchor_positions={anchor_positions}/>
      <AirfoilDots
        show_trace={show_trace}
        airfoil_points={airfoil_points}/>
    </svg>
  );
}

function TextInput({id, default_value, update}) {
  function blur_on_enter(event) {
    if (event.key === 'Enter') {
      event.target.blur();
    }
  }

  return (
    <input
      className="bg-gray-200 appearance-none border-2 border-gray-200 rounded py-2 px-4 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-gray-500 w-16 text-right"
    id={id}
    type="text"
    defaultValue={default_value}
    onBlur={update}
    onKeyDown={blur_on_enter}/>
  );
}

function AdminEntry({children, id, title, update, no_left_margin}) {
  return (
    <div className={"inline-block m-2"}>
      <div className="flex flex-row items-center">
        <div>
          <label
            className="block text-black font-bold text-right mb-1 mb-0 pr-2"
            htmlFor={id}>
              {title}
          </label>
        </div>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}

const small_button_style =
  "flex-none text-sm bg-blue-500 hover:bg-blue-700 text-white font-bold px-2 rounded";

function SmallButton({on_click, children}) {
  return (
    <div className="flex flex-col justify-center">
      <button
        className={small_button_style}
        onClick={on_click}>
          {children}
      </button>
    </div>
  );
}

function ExportAirfoilButton({n_nodes, node_positions, anchor_positions}) {
  const airfoil = {
    type: "airfoil",
    n_nodes: n_nodes,
    node_positions: node_positions.toJS(),
    anchor_positions: anchor_positions.toJS()
  };

  const airfoil_download =
    'data:application/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(airfoil, null, 2));

  return (
    <div className="inline-block m-2">
      <div className="flex flex-col justify-center">
        <a
          className={small_button_style}
          href={airfoil_download}
          download="airfoil.json">
            Export Airfoil
        </a>
      </div>
    </div>
  );
}


function points_in_xfoil_coordinates(airfoil_scale, airfoil_points) {
  return airfoil_points.map(
    ({x, y}) => [airfoil_scale * x, airfoil_scale * (0.5 - y)]);
}


function ExportPointsButton({airfoil_scale, airfoil_points}) {
  if (! airfoil_points)
    return "";

  const points_text =
    points_in_xfoil_coordinates(airfoil_scale, airfoil_points)
    .map(function ([x, y]) {
      return "" + x + " " + y + "\n";
    })
    .join("");

  const points_download =
    'data:text/plain;charset=utf-8,' +
    encodeURIComponent(points_text);

  return (
    <div className="inline-block mt-2">
      <div className="flex flex-col justify-center">
        <a
          className={small_button_style}
          href={points_download}
          download="points.txt">
            Export Points
        </a>
      </div>
    </div>
  );
}

function ImportAirfoilButton({
  set_nnodes,
  set_node_positions,
  set_anchor_positions,
  set_update_airfoil_points})
{
  function import_airfoil(event) {
    const files = event.target.files;
    if (files.length !== 1)
      return;
    const file = files[0];

    file.text().then(function (text) {
      const airfoil = JSON.parse(text);
      if (! (airfoil && airfoil.type === 'airfoil')) {
        set_message('invalid airfoil file');
        return
      }

      set_nnodes(airfoil.n_nodes);
      set_node_positions(I.List(airfoil.node_positions));
      set_anchor_positions(
        I.List(airfoil.anchor_positions.map(function (anchors) {
          return I.List(anchors);
        })));
      set_update_airfoil_points(true);
    });
  }

  return (
    <div className="inline-block m-2">
      <form className="flex flex-col justify-center">
        <label htmlFor="import-airfoil" className={small_button_style + " block"}>
          Import Airfoil
        </label>
        <input
          id="import-airfoil"
          className="hidden"
          type="file"
          accept="application/json"
          onChange={import_airfoil}/>
      </form>
    </div>
  );
}

function Admin(props) {
  function update_show_trace(event) {
    props.set_show_trace(event.target.checked);
  }

  function update_nnodes(event) {
    const n = parseInt(event.target.value);
    if (isNaN(n))
      return;
    props.set_number_of_nodes(n);
  }

  function update_npoints(event) {
    const n = parseInt(event.target.value);
    if (isNaN(n))
      return;
    props.set_number_of_airfoil_points(n);
  }

  function blur_on_enter(event) {
    if (event.key === 'Enter') {
      event.target.blur();
    }
  }

  const NumberOfNodes = (
    <AdminEntry
      no_left_margin="true"
      id="nnodes"
      title="Number of Nodes"
      update={update_nnodes}>
        <TextInput id="nnodes" default_value={props.n_nodes} update={update_nnodes}/>
    </AdminEntry>
  );

  const NumberOfAirfoilPoints = (
    <AdminEntry
      id="npoints"
      title="Number of Airfoil Points"
      update={update_npoints}>
        <TextInput id="npoints" default_value={props.n_airfoil_points} update={update_npoints}/>
    </AdminEntry>
  );

  function update_airfoil_scale(event) {
    const scale = parseFloat(event.target.value);
    if (isNaN(scale))
      return;
    props.set_airfoil_scale(scale);
    props.set_update_airfoil_points(true);
  }

  const AirfoilScale = (
    <AdminEntry
      id="airfoil-scale"
      title="Airfoil Scale">
        <TextInput
          id="airfoil-scale"
          default_value={props.airfoil_scale}
          update={update_airfoil_scale}/>
    </AdminEntry>
  );

  const ShowTrace = (
    <AdminEntry
      id="show-trace"
      title="Show Airfoil Points"
      update={update_show_trace}>
        <input id="show-trace" type="checkbox" onChange={update_show_trace}/>
    </AdminEntry>
  );

  return (
    <div className="m-4">
      <h1>Admin (not shown to user)</h1>
      <div className="mt-4">
        {NumberOfNodes}
        {NumberOfAirfoilPoints}
        {AirfoilScale}
        {ShowTrace}
        <ImportAirfoilButton
          set_nnodes={props.set_nnodes}
          set_node_positions={props.set_node_positions}
          set_anchor_positions={props.set_anchor_positions}
          set_update_airfoil_points={props.set_update_airfoil_points}/>
        <ExportAirfoilButton
          n_nodes={props.n_nodes}
          node_positions={props.node_positions}
          anchor_positions={props.anchor_positions}/>
        <ExportPointsButton
          airfoil_scale={props.airfoil_scale}
          airfoil_points={props.airfoil_points}/>
      </div>
      <div>
      </div>
    </div>);
}


function SvgContainer(props) {
  const [svg_size, set_svg_size] = useState(100);

  const svg_container = useRef(null);

  useLayoutEffect(
    function () {
      const element = svg_container.current

      const ro = new ResizeObserver(function (entries) {
        const rect = entries[0].contentRect;
        const size = Math.min(rect.height, rect.width);
        set_svg_size(size - 10);
      });
      ro.observe(element);
      return function () {
        ro.unobserve(element);
      };
    },
    []);

  return (
    <div ref={svg_container} className="flex-grow flex justify-center items-center relative w-full h-full" style={{opacity: props.calculating? 0.5 : 1.0}}>
      <Drawing svg_size={svg_size} {...props}/>
    </div>
  );
}


function DebugOutput({coordinates, result}) {
  return (
    <div className="bg-gray-300 p-8">
      <div className="flex flow-row">
        <div className="border border-black">
          <pre className="p-2">
            {coordinates}
          </pre>
        </div>
        <div className="border border-black">
          <pre className="p-2" style={{whiteSpace: "pre-wrap"}}>
            {result && (result.error || JSON.stringify({ lift: result.lift, drag: result.drag, performance: result.performance}, null, 2))}
          </pre>
        </div>
      </div>

      <div className="p-2 mt-4 border border-black">
        <p>airfoil.log</p>
        <pre>{result && result.airfoil_log}</pre>
      </div>

      <div className="p-2 mt-4 border border-black">
        <p>xfoil output</p>
        <pre>{result && result.xfoil_output}</pre>
      </div>

  </div>
  );
}

function describe_error(error) {
  if (! error)
    return "";

  if (error === "no result")
    return "No Result";
  else if (/Convergence failed/.test(error))
    return "Convergence Failed";
  else
    return "Error";
}

function display_number(x) {
  if (typeof x === 'number')
    return x.toFixed(2);
  else
    return "";
}

function ResultBar({result}) {
  return (
    <div className="p-4 bg-gray-100 w-64">
      <div className="font-bold">Lift</div>
      <div style={{minHeight: "1.5em"}}>{display_number(result && result.lift)}</div>

      <div className="mt-2 font-bold">Drag</div>
      <div style={{minHeight: "1.5em"}}>{display_number(result && result.drag)}</div>

      <div className="mt-2 font-bold">Performance</div>
      <div style={{minHeight: "1.5em"}}>{display_number(result && result.performance)}</div>

      <div className="mt-4 font-bold text-red-700">
        {describe_error(result && result.error)}
      </div>
    </div>
  );
}

function successful_xfoil_result(result) {
  return !! result.lift;
}

function Workspace(props) {
  const airfoil_points = props.airfoil_points;
  const set_airfoil_points = props.set_airfoil_points;

  const [coordinates, set_coordinates] = useState(null);

  const [result, set_result] = useState(null);

  const [last_good_airfoil, set_last_good_airfoil] = useState(null);

  const [calculating, set_calculating] = useState(false);

  function change_airfoil_points(points) {
    set_airfoil_points(points);

    const headers = new Headers();
    headers.append('Content-Type', 'application/json');

    const xfoil_coordinates =
      points_in_xfoil_coordinates(props.airfoil_scale, points);

    set_coordinates(
      xfoil_coordinates.map(([x, y]) => x + " " + y).join("\n"));

    // result will contain `airfoil_log`, `xfoil_output`, and
    // either `error` or `lift`, `drag`, and `performance`.

    set_calculating(true);

    fetch(
      'https://airfoil-scoring.eks-test-default.mpg-chm.com/compute_coeff',
      {
        method: 'POST',
        headers,
        cache: 'no-store',
        body: JSON.stringify(xfoil_coordinates)
      })
    .then(function (response) {
      return response.json();
    })
    .then(function (result) {
      set_result(result);
      set_calculating(false);
      if (successful_xfoil_result(result)) {
        set_last_good_airfoil({
          node_positions: props.node_positions,
          anchor_positions: props.anchor_positions});
      }
      else if (last_good_airfoil) {
        props.set_node_positions(last_good_airfoil.node_positions);
        props.set_anchor_positions(last_good_airfoil.anchor_positions);
        props.set_update_airfoil_points(true);
      }
    });
  }

  return (
    <div>
      <div className="flex flex-row" style={{height: "600px"}}>
        <SvgContainer
          airfoil_points={airfoil_points}
          change_airfoil_points={change_airfoil_points}
          calculating={calculating}
          {...props}/>
        <ResultBar result={result}/>
      </div>

      <DebugOutput coordinates={coordinates} result={result}/>
    </div>
  );
}

function App() {
  const [n_nodes, set_nnodes] = useState(10);

  const [airfoil_scale, set_airfoil_scale] = useState(1.0);

  const [n_airfoil_points, set_n_airfoil_points] = useState(100);

  const [airfoil_points, set_airfoil_points] = useState(null);

  const [node_positions, set_node_positions] = useState(
    initial_node_positions(n_nodes));

  const [anchor_positions, set_anchor_positions] = useState(
    initial_anchor_positions(n_nodes, node_positions));

  const [update_airfoil_points, set_update_airfoil_points] = useState(true);

  function set_number_of_nodes(n) {
    set_nnodes(n);
    const new_node_positions = initial_node_positions(n);
    set_node_positions(new_node_positions);
    set_anchor_positions(initial_anchor_positions(n, new_node_positions));
    set_update_airfoil_points(true);
  }

  function set_number_of_airfoil_points(n) {
    set_n_airfoil_points(n);
    set_update_airfoil_points(true);
  }

  const [show_trace, set_show_trace] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col">
      <div className="flex-none bg-gray-400">
        <Admin
          n_nodes={n_nodes}
          node_positions={node_positions}
          anchor_positions={anchor_positions}
          set_nnodes={set_nnodes}
          set_number_of_nodes={set_number_of_nodes}
          show_trace={show_trace}
          set_show_trace={set_show_trace}
          n_airfoil_points={n_airfoil_points}
          set_number_of_airfoil_points={set_number_of_airfoil_points}
          set_node_positions={set_node_positions}
          set_anchor_positions={set_anchor_positions}
          set_update_airfoil_points={set_update_airfoil_points}
          airfoil_scale={airfoil_scale}
          set_airfoil_scale={set_airfoil_scale}
          airfoil_points={airfoil_points}/>
      </div>
      <div className="flex-1">
        <Workspace
          n_nodes={n_nodes}
          node_positions={node_positions}
          set_node_positions={set_node_positions}
          anchor_positions={anchor_positions}
          set_anchor_positions={set_anchor_positions}
          update_airfoil_points={update_airfoil_points}
          set_update_airfoil_points={set_update_airfoil_points}
          show_trace={show_trace}
          airfoil_scale={airfoil_scale}
          n_airfoil_points={n_airfoil_points}
          airfoil_points={airfoil_points}
          set_airfoil_points={set_airfoil_points}/>
      </div>
    </div>);
}

export default hot(module)(App);
