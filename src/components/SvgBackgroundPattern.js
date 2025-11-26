// src/components/SvgBackgroundPattern.js


import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const SvgBackgroundPattern = ({ color = 'rgba(0, 0, 0, 0.04)', size = 100, dotRadius = 1 }) => {
  const dots = [];
  const spacing = 15; 

  for (let x = spacing / 2; x < size; x += spacing) {
    for (let y = spacing / 2; y < size; y += spacing) {
      dots.push(
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={dotRadius} fill={color} />
      );
    }
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {dots}
      </Svg>
    </View>
  );
};

export default SvgBackgroundPattern;