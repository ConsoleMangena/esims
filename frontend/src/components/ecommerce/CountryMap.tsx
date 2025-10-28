// react plugin for creating vector maps
import { VectorMap } from "@react-jvectormap/core";
import { worldMill } from "@react-jvectormap/world";

// Define the component props
interface CountryMapProps {
  mapColor?: string;
  markers?: Array<{ latLng: [number, number]; name: string; style?: any }>;
  selectedRegions?: string[];
}

const CountryMap: React.FC<CountryMapProps> = ({ mapColor, markers, selectedRegions }) => {
  const defaultMarkers = [
    {
      latLng: [-17.8252, 31.0335],
      name: "Zimbabwe (Harare)",
      style: {
        fill: "#465FFF",
        borderWidth: 1,
        borderColor: "white",
        stroke: "#383f47",
      },
    },
    { latLng: [-25.7479, 28.2293], name: "South Africa (Pretoria)", style: { fill: "#465FFF", borderWidth: 1, borderColor: "white" } },
    { latLng: [-24.6282, 25.9231], name: "Botswana (Gaborone)", style: { fill: "#465FFF", borderWidth: 1, borderColor: "white" } },
    { latLng: [-15.3875, 28.3228], name: "Zambia (Lusaka)", style: { fill: "#465FFF", borderWidth: 1, borderColor: "white" } },
    { latLng: [-25.9653, 32.5892], name: "Mozambique (Maputo)", style: { fill: "#465FFF", borderWidth: 1, borderColor: "white", strokeOpacity: 0 } },
  ];

  return (
    <VectorMap
      map={worldMill}
      backgroundColor="transparent"
      markerStyle={{
        initial: {
          fill: "#465FFF",
          r: 4,
        } as any,
      }}
      markersSelectable={true}
      selectedRegions={selectedRegions ?? ["ZW", "ZA", "BW", "ZM", "MZ"]}
      markers={markers ?? defaultMarkers}
      zoomOnScroll={false}
      zoomMax={12}
      zoomMin={1}
      zoomAnimate={true}
      zoomStep={1.5}
      regionStyle={{
        initial: {
          fill: mapColor || "#D0D5DD",
          fillOpacity: 1,
          fontFamily: "Outfit",
          stroke: "none",
          strokeWidth: 0,
          strokeOpacity: 0,
        },
        hover: {
          fillOpacity: 0.7,
          cursor: "pointer",
          fill: "#465fff",
          stroke: "none",
        },
        selected: {
          fill: "#465FFF",
        },
        selectedHover: {},
      }}
      regionLabelStyle={{
        initial: {
          fill: "#35373e",
          fontWeight: 500,
          fontSize: "13px",
          stroke: "none",
        },
        hover: {},
        selected: {},
        selectedHover: {},
      }}
    />
  );
};

export default CountryMap;
